# transform-gesture

Currently under development. Come back in a few days. (Mid of march 2014 or something)

`TransformGesture` is a standalone library that interprets pointer events and supplies you with simpler information like `translation`, `scale` and `rotation`.

## Usage
``` JavaScript
var gesture = new TransformGesture({translate: true, rotate: true, scale: true});
gesture.target = yourElement;
yourElement.addEventListener('pointerdown', function(event) { gesture.addPointer(event) });

yourElement.addEventListener('transformgesturestart', function(event) { ... });
yourElement.addEventListener('transformgesture'     , function(event) { ... });
yourElement.addEventListener('transformgestureend'  , function(event) { ... });
```

`TransformGesture` is inspired by [MSGesture](http://msdn.microsoft.com/en-us/library/windows/apps/hh968035.aspx) (Although not based on its implementation)