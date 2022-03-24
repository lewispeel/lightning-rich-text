import { Lightning, Utils } from '@lightningjs/sdk'

import { RichText } from './rich-text'

// apply custom styles that can be used globally
RichText.setGlobalStyles({
  foo: {
    highlight: true,
    highlightColor: 0xff00cc00,
    shadow: true,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    shadowBlur: 0,
    shadowColor: 0xffcc0000,
  },
})

export default class App extends Lightning.Component {
  static getFonts() {
    return [
      { family: 'Bold', url: Utils.asset('fonts/Roboto-Bold.ttf') },
      { family: 'Italic', url: Utils.asset('fonts/Roboto-Italic.ttf') },
      { family: 'Light', url: Utils.asset('fonts/Roboto-Light.ttf') },
      { family: 'Regular', url: Utils.asset('fonts/Roboto-Regular.ttf') },
    ]
  }

  static _template() {
    return {
      Background: {
        w: 1920,
        h: 1080,
        rect: true,
        color: 0xff222222,
      },
      Basic: {
        x: 50,
        y: 50,
        w: 1720,
        htmlText: 'This is <bold>bold</bold>',
        type: RichText,
      },
      Multiple: {
        x: 50,
        y: 100,
        w: 1720,
        htmlText:
          'This is <red>red</red>, this is <italic>italic</italic>, this is <red><italic>red & italic</italic></red>',
        styles: {
          // these styles can only be used by this instance
          red: {
            textColor: 0xffcc0000,
          },
        },
        type: RichText,
      },
      Custom: {
        x: 50,
        y: 150,
        w: 1720,
        htmlText: 'Go crazy with <foo>custom styling</foo>',
        type: RichText,
      },
    }
  }
}
