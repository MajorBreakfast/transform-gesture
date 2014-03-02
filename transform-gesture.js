/* global console, clearTimeout, setTimeout, window */

// Constructor
var TransformGesture = function(options) {
  // Defaults
  this.baseTranslation = {x: 0, y: 0};
  this.baseScale = 1;
  this.baseRotation = 0;
  this.origin = {x: window.innerWidth/2, y: window.innerWidth/2};

  // Override defaults
  this.set(options || {});

  // For remembering which pointers are on screen
  this.pointersDown = {};
  this.idsOfPointersDown = [];

  // Events
  document.addEventListener("pointermove", this.pointerMove.bind(this));
  document.addEventListener("pointerup", this.pointerUp.bind(this));
  document.addEventListener("pointercancel", this.pointerCancel.bind(this));
};

// Setter, ToDo: Use real setters/getters instead
TransformGesture.prototype.set = function(options) {
  this.baseTranslation = options.baseTranslation || {
     x: options.baseTranslationX !== undefined ? options.baseTranslationX :
                                                 this.baseTranslation.x,
     y: options.baseTranslationY !== undefined ? options.baseTranslationY :
                                                 this.baseTranslation.y
  };

  this.baseScale = options.baseScale !== undefined ? options.baseScale :
                                                     this.baseScale;

  this.baseRotation = options.baseRotation !== undefined ? options.baseRotation :
                                                           this.baseRotation;

  this.origin = options.origin ||
    {x: options.originX !== undefined ? options.originX : this.origin.x,
     y: options.originY !== undefined ? options.originY : this.origin.y};

  this.target = options.target !== undefined ? options.target : this.target;
};

// Shorthand for Object.defineProperty with first param preset to the prototype
var defineProperty = Object.defineProperty.bind(null, TransformGesture.prototype);


// --- Event Handlers ---

// Supposed to be called from the outside in a pointerdown event handler
TransformGesture.prototype.addPointer = function(event) {
  if (this.pointersDown[event.pointerId]) {
    console.warn('Transform Gesture: Discovered pointer that was not ' +
                 'properly removed.');
  } else {
    // Notify before
    if(this.idsOfPointersDown.length === 0) { this.firstPointerWillGetAdded(); }
    this.pointersDownArrayWillChange();

    // Add
    this.pointersDown[event.pointerId] = {position: {x: event.clientX,
                                                     y: event.clientY}};
    this.idsOfPointersDown.push(event.pointerId);

    // Notify after
    this.pointersDownArrayDidChange();
    if(this.idsOfPointersDown.length === 1) { this.firstPointerDidGetAdded(); }
  }
};

TransformGesture.prototype.pointerUp = function(event) {
  if (this.pointersDown[event.pointerId]) {
    // Notify before
    if(this.idsOfPointersDown.length === 1) { this.lastPointerWillGetRemoved(); }
    this.pointersDownArrayWillChange();

    // Remove
    delete this.pointersDown[event.pointerId];
    var index = this.idsOfPointersDown.indexOf(event.pointerId);
    this.idsOfPointersDown.splice(index, 1);

    // Notify after
    this.pointersDownArrayDidChange();
    if(this.idsOfPointersDown.length === 0) { this.lastPointerDidGetRemoved(); }
  }
};

TransformGesture.prototype.pointerCancel = function(event) {
  this.pointerUp(event);
};

TransformGesture.prototype.pointerMove = function(event) {
  if (this.pointersDown[event.pointerId]) { // Is it a pointer for this gesture?
    // Update
    var entry = this.pointersDown[event.pointerId];
    entry.position = {x: event.clientX, y: event.clientY};

    // Send event
    this.sendGestureChangeEventLater();
  }
};



// --- Before/After Changes to pointersDown Object/Array ---

// On addition of first pointer
TransformGesture.prototype.firstPointerWillGetAdded = function() {
};

TransformGesture.prototype.firstPointerDidGetAdded = function() {
  this.sendGestureStartEvent();
};


// On removal of last pointer
TransformGesture.prototype.lastPointerWillGetRemoved = function() {
};

TransformGesture.prototype.lastPointerDidGetRemoved = function() {
  // Explicitly unschedule the possibly scheduled further gesture event
  clearTimeout(this.sendGestureEventChangeTimeout);
  this.sendGestureEventChangeTimeout = null;

  // End event
  this.sendGestureEndEvent();
};


// On all pointer additions/removals
TransformGesture.prototype.pointersDownArrayWillChange = function() {
  console.log('snip! ' + Date.now());

  this.baseTranslation = this.translation;
  this.baseScale = this.scale;
  this.baseRotation = this.rotation;
};

TransformGesture.prototype.pointersDownArrayDidChange = function() {
  this.basePointersCenter = this.pointersCenter;
  this.baseSumOfDistancesToPointersCenter =
    this.sumOfDistancesToPointersCenter;
  this.baseGreatestPointersDistanceInfo =
    this.greatestPointersDistanceInfo;
};



// --- Events ---

// Start event
TransformGesture.prototype.sendGestureStartEvent = function() {
  if (this.target) {
    var event = document.createEvent('Event');
    event.initEvent('transformgesturestart', true, true);
    this.addEventValues(event);
    this.target.dispatchEvent(event);
  }
};


// End event
TransformGesture.prototype.sendGestureEndEvent = function() {
  if (this.target) {
    var event = document.createEvent('Event');
    event.initEvent('transformgestureend', true, true);
    this.addEventValues(event);
    this.target.dispatchEvent(event);
  }
};


// Change event
TransformGesture.prototype.sendGestureChangeEventLater = function() {
  // Don't go overboard with gesture events, max one per ms
  if (!this.sendGestureEventChangeTimeout) { // None scheduled, yet?
    this.sendGestureEventChangeTimeout =
      setTimeout(this.sendGestureChangeEvent.bind(this), 1);
  }
};

TransformGesture.prototype.sendGestureChangeEvent = function() {
  this.sendGestureEventChangeTimeout = null;

  if (this.target) {
    var event = document.createEvent('Event');
    event.initEvent('transformgesture', true, true);
    this.addEventValues(event);
    this.target.dispatchEvent(event);
  }
};


// Adds event values (used in all events)
TransformGesture.prototype.addEventValues = function(event) {
  event.pointersCount = this.idsOfPointersDown.length;

  var translation = this.translation;
  event.translationX = translation.x; event.translationY = translation.y;

  event.scale = this.scale;

  event.rotation = this.rotation;

  var pointersCenter = this.pointersCenter || this.lastCenter;
  event.pointersCenterX = pointersCenter.x;
  event.pointersCenterY = pointersCenter.y;
};



// --- Intermediate calculations ---

defineProperty("pointersCenter", { get: function() {
  var count = this.idsOfPointersDown.length;

  if (count === 0) { return null; }

  var sum = this.idsOfPointersDown.reduce(function(sum, id) {
    return addVectors(sum, this.pointersDown[id].position);
  }.bind(this), {x: 0, y: 0});

  // Note: this.lastCenter is used in addEventValues()
  return (this.lastCenter = {x: sum.x/count, y: sum.y/count});
}});

defineProperty("sumOfDistancesToPointersCenter", { get: function() {
  if (this.idsOfPointersDown.length === 0) { return null; }

  var pointersCenter = this.pointersCenter;

  return this.idsOfPointersDown.reduce(function(sum, id) {
    return sum + distance(this.pointersDown[id].position, pointersCenter);
  }.bind(this), 0);
}});

defineProperty("greatestPointersDistanceInfo", { get: function() {
  return this.idsOfPointersDown.reduce(function(info, id1) {
    return this.idsOfPointersDown.reduce(function(info, id2) {
      if (id1 >= id2) { return info; } // => Don't check twice

      var newInfo = {
        id1: id1,
        id2: id2,
        position1: this.pointersDown[id1].position,
        position2: this.pointersDown[id2].position
      };

      newInfo.distance = distance(newInfo.position1, newInfo.position2);

      if (newInfo.distance > info.distance) {
        var v = subtractVectors(newInfo.position1, newInfo.position2);
        newInfo.angle = Math.atan2(v.y,v.x);
        return newInfo;
      } else { return info; }
    }.bind(this), info);
  }.bind(this), {distance: 0, pointerId1: null, pointerId2: null});
}});

// Scaling relative to base
defineProperty("interimScale", { get: function() {
  var count = this.idsOfPointersDown.length;
  return (count >= 2) ? (this.sumOfDistancesToPointersCenter /
                         this.baseSumOfDistancesToPointersCenter) : 1;
}});

defineProperty("interimRotation", { get: function() {
  if (this.idsOfPointersDown.length >= 2) {

    var refInfo = this.baseGreatestPointersDistanceInfo,
        pos1 = this.pointersDown[refInfo.id1].position,
        pos2 = this.pointersDown[refInfo.id2].position,
        v = subtractVectors(pos1, pos2);

    return Math.atan2(v.y,v.x) - refInfo.angle;
  } else {
    return 0;
  }
}});



// --- Translation, scale, rotation ---

defineProperty("translation", { get: function() {
  var pointersCenter = this.pointersCenter;

  // Note: This function is also called when no pointers are on screen
  // => no pointersCenter and no translation
  if (pointersCenter) {
    var basePointersCenterToBaseTrans =
          subtractVectors(this.baseTranslation, this.basePointersCenter),
        pointersCenterToTrans =
          scaleVector(
            rotateVectorClockwise(basePointersCenterToBaseTrans,
                                  -this.interimRotation),
            this.interimScale
          );

    return addVectors(pointersCenter,pointersCenterToTrans);
  } else {
    return this.baseTranslation;
  }
}});

defineProperty("scale", { get: function() {
  return this.baseScale*this.interimScale;
}});

defineProperty("rotation", { get: function() {
  return this.baseRotation + this.interimRotation;
}});



// --- Helpers ---

function addVectors(v1, v2) { return {x: v1.x + v2.x,
                                      y: v1.y + v2.y}; }

function subtractVectors(v1, v2) { return {x: v1.x - v2.x,
                                           y: v1.y - v2.y}; }

function distance(v1, v2) { var a = v1.x - v2.x,
                                b = v1.y - v2.y;
                            return Math.sqrt(a*a + b*b); }

function scaleVector(vector, factor) { return {x: vector.x*factor,
                                               y: vector.y*factor}; }

function rotateVectorClockwise(vector, radians) {
  var sin = Math.sin, cos = Math.cos;
  return {x:  vector.x*cos(radians) + vector.y*sin(radians),
          y: -vector.x*sin(radians) + vector.y*cos(radians)};
}



export default TransformGesture;