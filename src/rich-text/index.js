import { Lightning } from '@lightningjs/sdk'
import merge from 'deepmerge'

import { getStyleGroupsHTML, types } from './groups'

const ALIGNMENT = {
  center: 'center',
  left: 'left',
  right: 'right',
}

const FLAGS = {
  all: 'all',
  alignment: 'alignment',
  text: 'text',
  size: 'size',
  style: 'style',
}

// these tags shouldn't be used.
// it's better to match the closing tag as the open
// tag could have attributes making it harder to catch
const RESERVED_TAGS = [
  '</title>',
  '</style>',
  '</base>',
  '</link>',
  '</meta>',
  '</script>',
  '</noscript>',
  '</head>',
]

const DEFAULT_STYLES = {
  default: { fontFace: 'Regular', fontSize: 32, verticalAlign: 'bottom' },
  bold: { fontFace: 'Bold' },
  italic: { fontFace: 'Italic' },
  light: { fontFace: 'Light' },
  regular: { fontFace: 'Regular' },
  highlight: {
    highlight: true,
    // adding padding helps to join each highlighted word without affecting spacing
    highlightPaddingLeft: 4,
    highlightPaddingRight: 4,
  },
}

let globalStyles = {}
let globalTextTransformer = null

const BREAK_SPACING = 0.00000001
const PARAGRAPH_SPACING = DEFAULT_STYLES.default.lineHeight

export class RichText extends Lightning.Component {
  static setGlobalStyles(styles) {
    globalStyles = styles
  }

  static setGlobalTextTransformer(value) {
    globalTextTransformer = value
  }

  static _template() {
    return {
      w: 500,
      testId: '', // add an id to the lightning inspector
    }
  }

  _construct() {
    this._alignment = 'left' // the alignment of the text within the bounds
    this._allStyles = {} // the merged default and instance styles
    this._context2D = null // used to measure text
    this._dirtyFlags = {} // flags to indicate which variables are dirty
    this._elements = [] // an array of elements to be rendered on screen
    this._htmlText = '' // html text to render
    this._isDirty = false // true if the styles or html text has changed
    this._styleGroups = [] // groups of text that use the same style
    this._styles = {} // instance styles
    this._textTransformer = null // transforms the text before being rendered

    this.__internalW = this.__internalH = 0

    this._markAsDirty()
  }

  _isFlagDirty(flag) {
    if (this._dirtyFlags[FLAGS.all]) return true
    if (this._dirtyFlags[flag]) return true
    return false
  }

  _markAsDirty(flag = FLAGS.all) {
    this._dirtyFlags[flag] = true
    if (!this._isDirty) {
      this._isDirty = true
      this.stage.once('frameEnd', () => this._update())
    }
  }

  _createElements() {
    const elements = []

    // ignore any spacing applied to the first group in the text
    const getLineHeightSpace = (groupIndex, space) => {
      return groupIndex === 0 ? 0 : space
    }

    const createText = (group, textFormat, paddingTop = 0) => {
      let text = group.text

      // create a string of all the tag names. this is attached
      // to the lightning element so it can be found using cypress
      const isNotDefaultTag = tag => tag.name !== 'default'
      const getTagName = tag => tag.name
      const tags = group.tags
        .filter(isNotDefaultTag)
        .map(getTagName)
        .join('-')

      // split text into words but keep spaces
      // https://stackoverflow.com/a/4514241/488653
      let words = text.split(' ')
      for (let i = words.length; i-- > 1; ) words.splice(i, 0, ' ')

      // remove words with zero length
      words = words.filter(word => word.length)

      let padding = paddingTop

      // iterate through each word
      words.forEach(word => {
        // measure the word using the text format
        const textMetrics = this._measureText(word, textFormat)

        // create an element for each word
        elements.push({
          w: Math.round(textMetrics.width),
          newLine: padding > 0,
          isWord: word !== ' ',
          testId: tags,
          text: {
            ...textFormat,
            lineHeight: textFormat.lineHeight + padding,
            text: word,
            // keep a copy of the original line height
            originalLineHeight: textFormat.lineHeight + padding,
          },
        })

        padding = 0
      })
    }

    // the paddingTop of a new line
    let linePaddingTop = 0

    // iterate through the style groups
    this._styleGroups.forEach((group, index) => {
      const { type } = group
      const textFormat = this._getTextFormatFromGroup(group)

      // just enough to trigger a new line but doesn't add extra space
      if (type === types.BREAK) {
        linePaddingTop += getLineHeightSpace(index, BREAK_SPACING)
        return
      }

      // triggers a new line
      if (type === types.PARAGRAPH) {
        linePaddingTop += getLineHeightSpace(index, PARAGRAPH_SPACING)
        return
      }

      // use the default height space
      if (type === types.TEXT) {
        createText(group, textFormat, linePaddingTop)
        linePaddingTop = 0
      }
    })

    this._elements = elements
  }

  _createStyles() {
    // merge default and instance styles into one object
    this._allStyles = merge.all([DEFAULT_STYLES, globalStyles, this._styles])
  }

  _createStyleGroups() {
    // replace newline characters with <br> tags
    let rawText = this._htmlText.replace(/[\n]+/g, '<br>')

    // transform text using GLOBAL transform
    rawText = globalTextTransformer ? globalTextTransformer(rawText) : rawText

    // transform text using LOCAL transform
    rawText = this._textTransformer ? this._textTransformer(rawText) : rawText

    // create groups based on styles
    this._styleGroups = getStyleGroupsHTML(rawText)
  }

  _getTextFormatFromGroup(group) {
    // iterate through all the tags in the group
    const formats = group.tags.map(tag => {
      const { name, attributes } = tag

      // find the style from the tag name
      const textFormat = this._allStyles[name] || {}

      // merge the style and the attributes in one object
      return merge(textFormat, attributes)
    })

    // merge all formats and return a single text format object
    return merge.all(formats)
  }

  _measureText(word, textFormat) {
    // create the context if there isn't one
    if (!this._context2D) {
      this._context2D = this.stage.platform.getDrawingCanvas().getContext('2d')
    }
    // set the font size and font face
    this._context2D.font = `${textFormat.fontSize}px ${textFormat.fontFace}`

    // return the TextMetrics object
    // https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics
    return this._context2D.measureText(word)
  }

  _positionElements() {
    // an array of lines
    const lines = []

    // the current line to add text to
    let currentLine = []

    // the maximum width available for this line
    const widthAvailable = this.w

    // the starting x position of new lines
    let indent = 0

    // keep track of the current x position
    let x = 0

    this._elements.forEach(element => {
      const { isBullet, newLine } = element

      // does this element include a highlight?
      const hasHighlight = element.text.highlight

      if (isBullet) {
        indent = 0
      }

      const outOfBounds = x + element.w >= widthAvailable
      const requestNewLine = outOfBounds || newLine

      // add the current line and reset the x value
      if (requestNewLine) {
        lines.push(currentLine)
        currentLine = []
        x = indent
      }

      const isWord = element.isWord
      const isFirstChar = x === indent

      // ignore spaces that appear as the first character on a line
      if (!isWord && isFirstChar) {
        return
      }

      // only add words to the array.
      // an expection being when the highlight style is used
      // as we need those spaces to be added on screem
      if (isWord || hasHighlight) {
        element.x = x
        // reset the line height as it was probably modified
        // when it was positioned previously
        element.text.lineHeight = element.text.originalLineHeight
        currentLine.push(element)
      }

      // increase x position
      x += element.w

      // start of a <li> tag
      // make sure the new lines are indented
      if (isBullet) {
        indent = element.w
      }
    })

    // make sure the last line is added
    lines.push(currentLine)

    // keep track of the current x/y position
    // let lineX = 0;
    let y = 0

    // before adding the lines
    // find the tallest word in the line and ensure every
    // word in that line has the same line height as the tallest
    this.children = lines
      .filter(line => line.length)
      .map(line => {
        const currY = y
        const tallest = line.reduce((a, b) => {
          return a.text.lineHeight > b.text.lineHeight ? a : b
        })
        y += tallest.text.lineHeight
        const lastWord = line[line.length - 1]
        return {
          // x: lineX,
          // manually set the y positions of each line
          // this allows us to find the total height
          // rather than wait for flexbox to render
          y: currY,
          h: tallest.text.lineHeight,
          w: lastWord.x + lastWord.w,
          children: line.map(element => {
            element.text.lineHeight = tallest.text.lineHeight
            return element
          }),
        }
      })

    // defensive check to make sure we have some content
    if (this.children.length) {
      // set the correct height for the RichText instance
      const lastLine = this.childList.last
      this.h = Math.round(lastLine.y + lastLine.h)
    }
  }

  _positionLines() {
    this.children.forEach(line => {
      switch (this._alignment) {
        case ALIGNMENT.right:
          line.x = this.w - line.w
          break
        case ALIGNMENT.center:
          line.x = Math.floor((this.w - line.w) / 2)
          break
        default:
          line.x = 0
      }
    })
  }

  _update() {
    // check for dirty flags
    const alignmentIsDirty = this._isFlagDirty(FLAGS.alignment)
    const sizeIsDirty = this._isFlagDirty(FLAGS.size)
    const styleIsDirty = this._isFlagDirty(FLAGS.style)
    const textIsDirty = this._isFlagDirty(FLAGS.text)

    if (styleIsDirty) {
      this._createStyles()
    }

    if (textIsDirty) {
      this._createStyleGroups()
    }

    if (textIsDirty || styleIsDirty) {
      this._createElements()
    }

    if (textIsDirty || styleIsDirty || sizeIsDirty) {
      this._positionElements()
    }

    if (textIsDirty || styleIsDirty || sizeIsDirty || alignmentIsDirty) {
      this._positionLines()
    }

    // reset dirty flags
    this._dirtyFlags = {}
    this._isDirty = false
  }

  // override method in lightning component class
  // get notified when the width or height is changed
  // so we can reposition the elements
  _updateDimensions() {
    super._updateDimensions()
    this._markAsDirty(FLAGS.size)
  }

  get textAlign() {
    return this._alignment
  }
  set textAlign(value) {
    if (this._alignment !== value) {
      this._alignment = value
      this._markAsDirty(FLAGS.alignment)
    }
  }

  get htmlText() {
    return this._htmlText
  }
  set htmlText(value = '') {
    if (this._htmlText !== value) {
      // warn about the usage of reserved tag names
      if (RESERVED_TAGS.some(v => value.includes(v))) {
        // eslint-disable-next-line no-console
        console.warn(
          `[RichText] "${value}" contains one or more reserved tags. Please check the documentation for details`
        )
      }

      this._htmlText = value
      this.testId = value
      this._markAsDirty(FLAGS.text)
    }
  }

  get text() {
    return this._htmlText.replace(/(<([^>]+)>)/gi, '')
  }

  get numberOfLines() {
    return this.children.length
  }

  get styles() {
    return this._styles
  }
  set styles(value) {
    if (JSON.stringify(this._styles) !== JSON.stringify(value)) {
      this._styles = value
      this._markAsDirty(FLAGS.style)
    }
  }

  get textTransformer() {
    return this._textTransformer
  }
  set textTransformer(value) {
    this._textTransformer = value
  }
}
