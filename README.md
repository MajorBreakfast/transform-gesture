# transform-gesture

**Currently under development. Come back in a few days. (Mid of march 2014 or something)**

`TransformGesture` is a standalone library that interprets pointer events ([YouTube - Talk about pointer events](http://www.youtube.com/watch?v=l8upftEWslM)) for you. It supplies you with simple information like `translation`, `scale` and `rotation`.

Although pointer events are currently only available unprefixed in Internet Explorer 11, there exists a polyfill ([Polymer Pointer Events Polyfill](https://github.com/polymer/PointerEvents)) that makes them available in all modern browsers. The polyfill is available via bower as "pointerevents-polyfill".

## Installation
This package is available via bower as `transform-gesture`.

## Why this package?
First, most of the multitouch libraries out there perform all kind of hacks in order to be cross browser compatible. transform-gesture **doesn't use any hacks** because it simply builds on top of pointer events. If a browser doesn't support pointer events natively, then the hackery stays inside the polyfill - but it's not directly in this library.

Second, the source of this library is clean and well documented. The math is explained in the documentation.

And finally, the implementation is rock solid, because it supports direct manipulation. That means if you scale something, it really zooms in at the part between your fingers and not somewhere else (e.g. at the center). It can even deal with **pinch to zoom using all 10 fingers while moving the browser window**! Don't take my word for it. Try it for yourself in the demos. (Btw. I think that only IE11 lets you move/resize the window while touching the screen somewhere else)

## Issues/Feature requests/Development
Note: Some things stated in this README are currently lies :) The only thing that's definitely true is: **It's under heavy development right now. Come back once everything is done!**

The name "transform-gesture" makes the scope of this library pretty clear, e.g. recognizing long presses is out of scope. However, I care very much about developer ergonomics. That is, if you're building a library that depends on transform-gesture and you need aditional public APIs to make the integration clean, I'd be happy to talk it through! Also, there is certainly functionality that can be considered in the scope of this library. If you have any ideas, just open an issue or submit a pull request. (Even if you just spotted a typo :)

## Usage
``` JavaScript
var gesture = new TransformGesture({translate: true, rotate: true, scale: true});
gesture.target = yourElement;
yourElement.addEventListener('pointerdown', function(event) { gesture.addPointer(event) });

yourElement.addEventListener('transformgesturestart', function(event) { ... });
yourElement.addEventListener('transformgesture'     , function(event) { ... });
yourElement.addEventListener('transformgestureend'  , function(event) { ... });
```

## Algorithmns
### Translation
For the translation the pointers' center of mass is calculated (Average of the pointer positions). The translation is then simply the offset of the center of mass to a reference center of mass.

### Scaling
Sum up the distances of the pointer positions to the center of mass of the pointer positions. Compare this sum to a reference value computed in the same way.

### Translation adjustment
The center for scaling and rotation is of course the center of mass of the pointer positions. Since this is most likely not the origin of the to be transformed object the translation has to be adjusted to make the object stick to the fingers. The adjustment vector is the scaled and rotated vector from the reference center of mass to the reference translation. The final translation is the the reference translation plus this adjustment vector.

### Translation (Alternative approach, not implemented)
Determine translation by averaging the position differences of the pointers with the same id in the current pointer set and the reference pointer set.

### Scaling (Alternative approach 1, not implemented)
Compute the area of the convext hull of the pointer positions. Determine the scale factor by comparing the area to a reference convex hull area.

### Scaling (Alternative approach 2, not implemented)
Sum up the edge lengths of all possible edges between the current pointer positions. Determine the scale factor by comparing it to a reference length computed in the same way.

### Scaling (Alternative approach 3, not implemented, although very similar to it)
Compute the center of mass of the pointer positions. Compute of all pointer positions the average distance to the center of mass. Determine the scale factor by comparing this average to a reference value computed in the same way.

### Patents
Although I don't own any patents for these algorithmns, the design ideas for above algorithmns are my own (although some are so simple that probably many people invented them before me :). If you think a patent of yours is infringed, notify me with concrete proof and sufficient details on where the infrigement(s) occurs/occur before you press charges. I state the alternative approaches above in order to ensure that they cannot be patented if I publicized them first and to have alternative approaches to switch to if a patent claim is indeed valid and enforced.

## License
MIT, see license file for details.

Out of curiosity: Tell me if you use this library! It'd be nice to see it in action :)

## Acknowledgement
`TransformGesture` is inspired by [MSGesture](http://msdn.microsoft.com/en-us/library/windows/apps/hh968035.aspx) (But not based on its implementation - I don't think it source is available publicly anyway).