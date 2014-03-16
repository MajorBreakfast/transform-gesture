# transform-gesture

**Currently under development. Although everything now works as advertised, it still needs a lot of cleanup and demos. Come back in a few days (End of march 2014 or something).**

`TransformGesture` is a standalone library that interprets pointer events ([YouTube - Talk about pointer events](http://www.youtube.com/watch?v=l8upftEWslM)) for you. It supplies you with simple information like `translation`, `scale` and `rotation`.

Although pointer events are currently only available unprefixed in Internet Explorer 11, there exists a polyfill ([Polymer Pointer Events Polyfill](https://github.com/polymer/PointerEvents)) that makes them available in all modern browsers. The polyfill is available via bower as "pointerevents-polyfill".

## Installation
This package is available via bower as `transform-gesture`.

## Why this package?
First, most of the multitouch libraries out there perform all kind of hacks in order to be cross browser compatible. transform-gesture **doesn't use any hacks** because it simply builds on top of pointer events. If a browser doesn't support pointer events natively, then the hackery stays inside the polyfill - but it's not directly in this library.

Second, the source of this library is clean and well documented. The math is explained in the documentation.

And finally, the implementation is rock solid, because it supports direct manipulation. That means if you scale something, it really zooms in at the part between your fingers and not somewhere else (e.g. at the center). It can even deal with **pinch to zoom using all 10 fingers while moving the browser window**! Don't take my word for it. Try it for yourself in the demos. (Btw. I think that only IE11 lets you move/resize the window while touching the screen somewhere else)

## Issues/Feature requests/Development
The name "transform-gesture" makes the scope of this library pretty clear, e.g. recognizing long presses is out of scope. However, I care very much about developer ergonomics. That is, if you're building a library that depends on transform-gesture and you need aditional public APIs to make the integration clean, I'd be happy to talk it through! Also, there is certainly functionality that can be considered in the scope of this library. If you have any ideas, just open an issue or submit a pull request. (Even if you just spotted a typo :)

## Usage example
``` JavaScript
var gesture = new TransformGesture({ canRotate: true, canScale: true, eventTarget: yourElement })

yourElement.addEventListener('pointerdown', function(event) { gesture.addPointer(event) })

yourElement.addEventListener('transformgesturestart',  function(event) { /* event.gesture */ ... })
yourElement.addEventListener('transformgesturechange', function(event) { ... })
yourElement.addEventListener('transformgestureend',    function(event) { ... })
```

## Properties / Options
All these properties can either be set directly on the gesture object or via the options hash in the constructor.

- `eventTarget` (Default: null) Defines the DOM element to which the gesture events should be sent.
- `canRotate`, 'canScale' (Default: `false`) These two properties determine whether rotation and scaling are enabled or not. By default both are disabled because either generally require you to define the `coordinateTransformation` as well to work properly. transform-gesture still does a better job for just dragging than most alternative solutions because it doesn't jitter or stop working if two or more finger hit the screen. It is definitly not overkill to use it just for dragging. By the way there is no `canTranslate` property because rotation and scaling require translation which makes tranlation madatory.
- `coordinateTransformation` (Default: `function(v) { return v }`) Defines a coordinate transformation form window coordinates (origin top left corner) to the coordinate system of the element you're working in.
  Examples:
  ``` JavaScript
  function(vec) { // For CSS transform-origin: top left
    return {
      x: vec.x - $('.transformed').offset().left
      y: vec.y - $('.transformed').offset().top
    }
  }
  ```
  ``` JavaScript
  function(vec) { // For CSS transform-origin: 50% 50% (Default)
    return {
      x: vec.x - $('.transformed').offset().left - $('.transformed').width()/2
      y: vec.y - $('.transformed').offset().top - $('.transformed').height()/2
    }
  }
  ```
  Admittedly it is a bit hard to wrap your head around how this property works. But transform-gesture cannot do its job without it. This property is basically the reason why the object sticks to your finger even while scaling and rotating. Take a look at the demos to see the whole setup in context.
- `translationX`, `translationY`, 'rotation', 'scale' (Readonly) These properties are basically the end result

## jQuery
Although transform-gesture doesn't depend on jQuery, you can certainly use both together. Note that using jQuery means that the `event.gesture` property is then located under `event.originalEvent.gesture`.

## Algorithmns
### Translation
For the translation the pointers' center of mass is calculated (Average of the pointer positions). The translation is then simply the offset of the center of mass to a reference center of mass.

### Scaling
Sum up the distances of the pointer positions to the center of mass of the pointer positions. Compare this sum to a reference value computed in the same way.

### Rotation
Determine the two pointers in the reference set that are widest apart and compute the angle of their connecting line. Then compute the equivalent line with the current pointer positions. The rotation is determined by the angle difference of that line's angle to the reference angle.

### Translation adjustment
The center for scaling and rotation is of course the center of mass of the pointer positions. Since this is most likely not the origin of the to be transformed object the translation has to be adjusted to make the object stick to the fingers. The adjustment vector is the scaled and rotated vector from the reference center of mass to the reference translation. The final translation is the the reference translation plus this adjustment vector.

### State
To increase computational accuracy, transform-gesture stores the translation, rotation and scale in two stages: Base and interim. The final translation/rotation is computed by adding up the base and interim translation/rotation. The final scale is computed by multiplying the base and interim scale. Each time a new pointer is added or an old pointer removed, the base state is updated and the interim state is reset (translation=(0,0), scale=1, rotation=0).

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