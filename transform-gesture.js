/* global console, clearTimeout, setTimeout, window */

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

TransformGesture.prototype.set = function(options) {
  this.baseTranslation = options.baseTranslation ||
    {x: options.baseTranslationX !== undefined ? options.baseTranslationX : this.baseTranslation.x,
     y: options.baseTranslationY !== undefined ? options.baseTranslationY : this.baseTranslation.y};

  this.baseScale = options.baseScale !== undefined ? options.baseScale : this.baseScale;

  this.baseRotation = options.baseRotation !== undefined ? options.baseRotation : this.baseRotation;

  this.origin = options.origin ||
    {x: options.originX !== undefined ? options.originX : this.origin.x,
     y: options.originY !== undefined ? options.originY : this.origin.y};

  this.target = options.target !== undefined ? options.target : this.target;
};


// --- Event Handlers ---

// addPointer() should be called from a pointerdown event handler outside
TransformGesture.prototype.addPointer = function(event) {
  if (this.pointersDown[event.pointerId]) {
    console.warn('Transform Gesture: Oh crap, the pointer is already in the list.');
  } else {
    // Notify before
    if(this.idsOfPointersDown.length === 0) { this.firstPointerWillGetAdded(); }
    this.pointersDownArrayWillChange();

    // Add
    this.pointersDown[event.pointerId] = {
      position: {x: event.clientX, y: event.clientY},
      lastPosition: {x: event.clientX, y: event.clientY}
    };
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

    // Add
    delete this.pointersDown[event.pointerId];
    this.idsOfPointersDown.splice(this.idsOfPointersDown.indexOf(event.pointerId), 1);

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
    entry.lastPosition = entry.position;
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
  // Unschedule further gesture event (if it is scheduled)
  clearTimeout(this.sendGestureEventChangeTimeout);
  this.sendGestureEventChangeTimeout = null;

  // Gesture end event
  this.sendGestureEndEvent();
};


// On all changes
TransformGesture.prototype.pointersDownArrayWillChange = function() {
  this.baseTranslation = this.translation();
  this.baseScale = this.scale();
  this.baseRotation = this.rotation();
};

TransformGesture.prototype.pointersDownArrayDidChange = function() {
  this.basePointersCenter = this.pointersCenter();
  this.baseSumOfDistancesToCenter = this.sumOfDistancesToCenter();
};


// --- Events ---

TransformGesture.prototype.sendGestureStartEvent = function() {
  if (this.target) {
    var event = document.createEvent('Event');
    event.initEvent('transformgesturestart', true, true);
    this.addEventValues(event);
    this.target.dispatchEvent(event);
  }
};

TransformGesture.prototype.sendGestureEndEvent = function() {
  if (this.target) {
    var event = document.createEvent('Event');
    event.initEvent('transformgestureend', true, true);
    this.addEventValues(event);
    this.target.dispatchEvent(event);
  }
};

TransformGesture.prototype.sendGestureChangeEventLater = function() {
  // Don't go overboard with gesture events, max one per ms
  if (!this.sendGestureEventChangeTimeout) { // None scheduled, yet?
    this.sendGestureEventChangeTimeout = setTimeout(this.sendGestureChangeEvent.bind(this), 1);
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

TransformGesture.prototype.addEventValues = function(event) {
  event.pointersCount = this.idsOfPointersDown.length;

  var translation = this.translation();
  event.translationX = translation.x; event.translationY = translation.y;

  event.scale = this.scale();

  event.rotation = 0;

  var pointersCenter = this.pointersCenter() || this.lastCenter;
  event.pointersCenterX = pointersCenter.x; event.pointersCenterY = pointersCenter.y;
};


// --- Calculations ---

TransformGesture.prototype.pointersCenter = function() {
  var count = this.idsOfPointersDown.length;

  if (count === 0) { return null; }

  var sum = this.idsOfPointersDown.reduce(function(sum, id) {
    return addVectors(sum, this.pointersDown[id].position);
  }.bind(this), {x: 0, y: 0});

  // Note: this.lastCenter is used in addEventValues()
  return (this.lastCenter = {x: sum.x/count, y: sum.y/count});
};

TransformGesture.prototype.sumOfDistancesToCenter = function() {
  if (this.idsOfPointersDown.length === 0) { return null; }

  var pointersCenter = this.pointersCenter();

  return this.idsOfPointersDown.reduce(function(sum, id) {
    return sum + distance(this.pointersDown[id].position, pointersCenter);
  }.bind(this), 0);
};

// Scaling relative to base
TransformGesture.prototype.interimScale = function() {
  var count = this.idsOfPointersDown.length;
  return (count >= 2) ? (this.sumOfDistancesToCenter() / this.baseSumOfDistancesToCenter) : 1;
};


TransformGesture.prototype.translation = function() {
  var pointersCenter = this.pointersCenter();

  // Note: This function is also called when no pointers are on screen
  // => no pointersCenter and no translation
  if (pointersCenter) {
    var basePointersCenterToBaseTrans = subtractVectors(this.baseTranslation, this.basePointersCenter),
        pointersCenterToTrans = scaleVector(basePointersCenterToBaseTrans, this.interimScale());

    return addVectors(pointersCenter,pointersCenterToTrans);
  } else {
    return this.baseTranslation;
  }
};

TransformGesture.prototype.scale = function() {
  var count = this.idsOfPointersDown.length;
  return (count >= 2) ? this.baseScale*this.interimScale() : this.baseScale;
};

TransformGesture.prototype.rotation = function() {
  return 0;
};


// --- Helpers ---

function subtractVectors(vector, refVector) {
  return {x: vector.x - refVector.x, y: vector.y - refVector.y};
}

function addVectors(vector, refVector) {
  return {x: vector.x + refVector.x, y: vector.y + refVector.y};
}

function distance(vector, refVector) {
  var a = vector.x - refVector.x, b = vector.y - refVector.y;
  return Math.sqrt(a*a + b*b);
}

function scaleVector(vector, factor) {
  return {x: vector.x*factor, y: vector.y*factor};
}

function rotateVector(vector, radians) {
  var sin = Math.sin, cos = Math.cos;

  // Clockwise rotation
  return {x:  vector.x*cos(radians) + vector.y*sin(radians),
          y: -vector.x*sin(radians) + vector.y*cos(radians)};
}

export default TransformGesture;