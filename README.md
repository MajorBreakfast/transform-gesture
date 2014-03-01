# transform-gesture

Currently under development. Come back in a few days. (Mid of march 2014 or something)

`TransformGesture` is a standalone library that interprets pointer events for you. It supplies you with simple information like `translation`, `scale` and `rotation`.

## Installation
This package is available via bower as `transform-gesture`.

## Usage
``` JavaScript
var gesture = new TransformGesture({translate: true, rotate: true, scale: true});
gesture.target = yourElement;
yourElement.addEventListener('pointerdown', function(event) { gesture.addPointer(event) });

yourElement.addEventListener('transformgesturestart', function(event) { ... });
yourElement.addEventListener('transformgesture'     , function(event) { ... });
yourElement.addEventListener('transformgestureend'  , function(event) { ... });
```

## License
MIT, see license file for details

## Acknowledgement
`TransformGesture` is inspired by [MSGesture](http://msdn.microsoft.com/en-us/library/windows/apps/hh968035.aspx) (Although not based on its implementation).