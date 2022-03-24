# RichText

This component helps make complex text areas with multiple text formats easier to create and manage.

## Usage

```js
class Example extends Lightning.Component {
  static _template() {
    return {
      RichText: {
        type: RichText,
        htmlText: '<h0>Title</h0>',
      },
    };
  }
}
```

## Features

- Uses HTML-style tagging to associate text to a particular set of stying rules.
- Tag names are strings; `<italic>Star Wars</italic>` or `<name>Star Wars</name>` (see [Reserved tags](#reserved-tags))
- Nest multiple tags to combine styles. `<italic><name>Star Wars</name></italic>`
- A selection of [Lightning Text](http://www.lightningjs.io/docs/#/lightning-core-reference/RenderEngine/Textures/Text) properties are supported but due to how the text is split, some could have undesirable result, see [Custom styles](#custom-styles).
- Create a global stylesheet that is used across the entire application.
- If no style can be matched with a tag, it's ignored and the default style is used.
- Apply global and/or instance-based text transform functions to text before it's rendered.
- Supports `left`, `right` and `center` text alignment.

## Limitations

It's not possible to create complex text areas solely using Lightning as the text rendering inside WebGL is limited. This component is an attempt to add some of those missing features.
While RichText does improve the text capabilites of Lightning applications, it too has limitations.

- Underline: this feature is trivial for most text renderers but would be expensive to calculate for RichText.
- Subscript & superscript: Not currently possible.
- Vertical alignment is forced to be `bottom` - this is so different sized text can be aligned uniformly.

## Properties

- `textAlign`: Text alignment. Possible values: `left`, `right`, `center`. Defaults to `left`.
- `htmlText`: HTML-style text to render.
- `styles`: An object that stores custom styles to change the appearence of text.
- `textTransform`: A method to change the text before it's processed (change to uppercase for example).

## Measuring

This is how to get the height of the RichText component after text has been applied.

```
this.tag('RichText').onUpdate = () => {
  console.log(this.tag('RichText').h);
};
```

## Reserved tags

RichText uses [DomParser](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser) to convert the `htmlText` string into a tree which can be traversed.
When the parser finds certain tags, it will hoist them from `<body>` into `<head>` and converts the inner html into a string. Meaning if you have some text like this;

```javascript
htmlText = '<title>Star<br>Wars</title>';
```

The `<br>` tag will appear as text rather than insert a line break. If however you have no inner html it should work fine but just to be safe, it's advised that you avoid using the following tag names; `title`, `style`, `base`, `link`, `meta`, `script` & `noscript`. If RichText detects the usage of any of these tags it will add a warning in the console.


## Default styles

The default styles that are available without any configuarion are; `regular`, `light`, `bold`, `italic` & `highlight`.

If text isn't wrapped in any tags the default style `<p1>` will be used.

## Custom styles

A custom style object can contain any of the properties used by the [Lightning Text](http://www.lightningjs.io/docs/#/lightning-core-reference/RenderEngine/Textures/Text) object. However, due to how the text is broken up inside RichText, certain properties might have undesirable results.

For example; setting `textAlign: right` won't have any effect as it's applied to each word rather than to a block of text. Other unsupported properties include;

- `maxLines` & `maxLinesSuffix`
- `textBaseline`
- `textOverflow`
- `wordWrap` & `wordWrapWidth`
- `paddingLeft` & `paddingRight`

These kinds of feature are things we're hoping to support in future releases.

## Attribute styles

For even greater flexibilty, it's possible to add attributes to any tag to change the style.

```javascript
class Example extends Lightning.Component {
  static _template() {
    return {
      RichText: {
        type: RichText,
        htmlText: `<h1>H1</h1> and <h1 textColor='0xff00cc00'>H1 in Green</h1>`,
      },
    };
  }
}
```

## Styling rules

RichText provides powerful styling options which can be simple or complex depending on your needs.

When RichText formats its text, it creates a style object for each word that combines the appropriate Sky, global, instance & attribute styles. For example;

```javascript
// always set global styles before creating any RichText instances
RichText.setGlobalStyles({
  movietitle: {
    fontSize: 48,
    textColor: 0xffffffff,
  },
});

class Example extends Lightning.Component {
  static _template() {
    return {
      RichText: {
        type: RichText,
        htmlText: `<movietitle highlight='true'>Star Wars</movietitle>`,
        styles: {
          movietitle: {
            highlight: false,
            textColor: 0xffcc0000,
          },
        },
      },
    };
  }
}
```

When calculating the style for the "Star Wars" text, we first create an empty object to hold our style properties;

```javascript
styles = {};
```

The first group of styles to be applied are the default styles. As the text doesn't use any of these styles, the default style will be applied.

```javascript
styles = {
  fontFace: 'regular.ttf', // default styles
  fontSize: 32, // default styles
  textColor: 0xfff1f1f1, // default styles
};
```

The next set of styles to be applied are the global styles. In our example, we've defined a global `movietitle` style. This will be merged with our existing style object. Notice there is a clash between our existing `fontSize` and `textColor` properties. As the global styles are applied afterwards, these will take precedence and override the existing values. Once this has been applied, our style will look like this;

```javascript
styles = {
  fontFace: 'regular.ttf', // default styles
  fontSize: 48, // global styles
  textColor: 0xffffffff, // global styles
};
```

The next set of styles to be applied are the instance styles. In our example, we've defined an instance `movietitle` style. Again, we have a clash of `textColor` and instance styles will override existing values. Once this has been applied, our style will look like this;

```javascript
styles = {
  fontFace: 'regular.ttf', // default styles
  fontSize: 48, // global styles
  highlight: false, // instance styles
  textColor: 0xffcc0000, // instance styles
};
```

The final set of styles to be applied are the attribute styles. In our example we've defined some attribute styles and we have a clash of the `highlight` property. Once they have been applied, our style will look like this;

```javascript
styles = {
  fontFace: 'regular.ttf', // default styles
  fontSize: 48, // global styles
  highlight: true, // attribute styles
  textColor: 0xffcc0000, // instance styles
};
```

This is the final style object that will be used when rendering our Star Wars text.

### Nested styles

When nesting a style inside another, e.g. `<green><italic>green and italic</italic></green>` - the following rules apply;

- `<green>` styles are applied first.
- `<italic>` will be applied second, overriding any existing style properties from `<italic>`

For example;

```javascript
{
  green: {
    fontFamily: 'regular.ttf',
    fontSize: 32,
    textColor: 0xff00cc00,
  },
  italic: {
    fontFamily: 'italic.ttf',
  },
}
```

The combined style will look like this;

```javascript
{
  fontFamily: 'italic.ttf',
  fontSize: 32,
  textColor: 0xff00cc00,
}
```

### Conflicting nested styles

Sometimes it's not possible to merge two given styles. For example;

```javascript
{
  bold: {
      font: 'assets/fonts/bold.ttf',
      fontSize: 28,
  },
  italic: {
      font: 'assets/fonts/italic.ttf',
  },
};
```

Here we have a clash of fonts, RichText cannot create a bold & italic font from two different font files. In this scenario the inner-most tag (last style to be applied) wins and will produce a style that looks like this;

```javascript
{
    font: 'assets/fonts/italic.ttf',
    fontSize: 28,
}
```

However, we can get around this by creating a new custom `<bolditalic>` tag with its own styling;

```javascript
{
  bolditalic: {
    font: 'assets/fonts/bold_italic.ttf',
  },
};
```

## Text transformers

If you need to transform the text in any way before it's processed by RichText, you have two options.

### Instance

This will be applied only to the instance.

```javascript
class Example extends Lightning.Component {
  static _template() {
    return {
      RichText: {
        type: RichText,
        htmlText: `<movietitle>Star Wars</movietitle>`,
        textTransformer: (htmlText) => htmlText.toUpperCase(),
      },
    };
  }
}
```

### Global

You can also apply a function globally to all instances. It is not advised to use global styles inside a Journey as you could potentially override existing global styles in the application.

```javascript
RichText.setGlobalTextTransformer((htmlText) => htmlText.toUpperCase());
```

The global transforms will be applied first, then then instance transforms.

## Line Breaks

To insert a line break into the text you can use `<br>`, `<br />` or `\n`.

```javascript
class Example extends Lightning.Component {
  static _template() {
    return {
      RichText: {
        type: RichText,
        htmlText: `Sometimes\nyou might want to<br />force the text onto a<br>new line.`,
      },
    };
  }
}
```

## Paragraphs

Text can be wrapped in a `<p>` tag to ensure there's a clear gap between the previous text section.

```javascript
class Example extends Lightning.Component {
  static _template() {
    return {
      RichText: {
        type: RichText,
        htmlText: `You can set spaces in the text by using paragraphs.<p>This is useful when you want to break up large sections to make it more readable.<p><h2>You can use different font sizes too...</h2><p>...and get consistent spacing.`,
      },
    };
  }
}
```
