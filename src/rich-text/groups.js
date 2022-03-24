const TEXT_PROPS = {
  fontface: 'fontFace',
  fontsize: 'fontSize',
  fontstyle: 'fontStyle',
  lineheight: 'lineHeight',
  textalign: 'textAlign',
  verticalalign: 'verticalAlign',
  wordwrap: 'wordWrap',
  maxlines: 'maxLines',
  maxlinessuffix: 'maxLinesSuffix',
  wordwrapwidth: 'wordWrapWidth',
  textoverflow: 'textOverflow',
  textbaseline: 'textBaseline',
  textcolor: 'textColor',
  paddingleft: 'paddingLeft',
  paddingright: 'paddingRight',
  // highlight: 'highlight', // not needed as its not camelcase
  highlightcolor: 'highlightColor',
  highlightOffset: 'highlightOffset',
  highlightpaddingleft: 'highlightPaddingLeft',
  highlightpaddingright: 'highlightPaddingRight',
  offsetx: 'offsetX',
  offsetY: 'offsetY',
  // shadow: 'shadow', // not needed as its not camelcase
  shadowcolor: 'shadowColor',
  shadowoffsetx: 'shadowOffsetX',
  shadowoffsety: 'shadowOffsetY',
  shadowblur: 'shadowBlur',
  cutsx: 'cutSx',
  cutex: 'cutEx',
  cutsy: 'cutSy',
  cutey: 'cutEy',
}

const domParser = new DOMParser()

// converts a lowercase attribute into a camelcase lightning text property
const mapAttributeToTextProp = att => TEXT_PROPS[att] || att

export const types = {
  BREAK: 'BR',
  PARAGRAPH: 'P',
  TEXT: '#text',
}

const getStyleGroups = (text, domType, domRoot) => {
  // document object from the text
  const doc = domParser.parseFromString(text, domType)

  // create a tree walker of all nodes from the document
  const walker = doc.createTreeWalker(doc)

  // create an array of #text nodes
  const nodes = []
  while (walker.nextNode()) {
    nodes.push(walker.currentNode)
  }

  // create an array of groups that contain something to render
  // each group represents a section of text that uses the same style

  const groups = []

  nodes.forEach(node => {
    const { nodeName, nodeValue } = node

    // ignore any nodes that aren't in the types object
    const nodeTypeIsValid = Object.values(types).includes(nodeName)

    if (nodeTypeIsValid) {
      const tags = [] // array to store the tag hierarchy

      // starting with the nodes parent
      let n = node.parentElement

      // work your way down the tree
      while (n) {
        // stop when we reach the root tag
        if (n.nodeName === domRoot) break

        // convert the node name to lowercase
        const nodeNameLowerCase = n.nodeName.toLowerCase()

        // collect the attributes
        const attributes = {}
        const attributesLength = n.attributes.length

        for (let i = 0; i < attributesLength; i++) {
          const { name, value } = n.attributes[i]

          // ensure the name is camelcase
          const ccName = mapAttributeToTextProp(name)

          // add attribute
          attributes[ccName] = value
        }

        // add the tag name and attributes to the array
        tags.unshift({
          name: nodeNameLowerCase,
          attributes,
        })

        // repeat with the parent element
        n = n.parentElement
      }

      // add the default tag and empty attributes at the
      // start of the array this ensures we always have
      // the default style as a base
      tags.unshift({
        name: 'default',
        attributes: {},
      })

      // add to the group array
      groups.push({
        tags,
        text: nodeValue || '',
        type: nodeName,
      })
    }
  })

  return groups
}

export const getStyleGroupsHTML = text => getStyleGroups(text, 'text/html', 'BODY')
