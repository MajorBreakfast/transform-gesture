/* global console, clearTimeout, setTimeout */

var TransformGesture = function(options) {
  options = options || {};
  this.options = {
    translate: (options.translate !== undefined) ? !!options.translate : true,
    rotate: (options.rotate !== undefined) ? !!options.rotate : false,
    scale: (options.scale !== undefined) ? !!options.scale : false
  };

  this.pointersDown = {};
  this.idsOfPointersDown = [];

  document.addEventListener("pointermove", this.pointerMove.bind(this));
  document.addEventListener("pointerup", this.pointerUp.bind(this));
  document.addEventListener("pointercancel", this.pointerCancel.bind(this));
};


// --- Event Handlers ---

// addPointer() should be called from a pointerdown event handler outside
TransformGesture.prototype.addPointer = function(event) {
  if (this.pointersDown[event.pointerId]) {
    console.warn('Transform Gesture: Oh crap, the pointer is already in the list.');
  } else {
    if(this.idsOfPointersDown.length === 0) { this.firstPointerWillGetAdded(); }
    this.pointersDownArrayWillChange();

    this.pointersDown[event.pointerId] = {
      position: {x: event.clientX, y: event.clientY},
      lastPosition: {x: event.clientX, y: event.clientY}
    };
    this.idsOfPointersDown.push(event.pointerId);

    this.pointersDownArrayDidChange();
    if(this.idsOfPointersDown.length === 1) { this.firstPointerDidGetAdded(); }
  }
};

TransformGesture.prototype.pointerUp = function(event) {
  if (this.pointersDown[event.pointerId]) {
    if(this.idsOfPointersDown.length === 1) { this.lastPointerWillGetRemoved(); }
    this.pointersDownArrayWillChange();

    delete this.pointersDown[event.pointerId];
    this.idsOfPointersDown.splice(this.idsOfPointersDown.indexOf(event.pointerId), 1);


    this.pointersDownArrayDidChange();
    if(this.idsOfPointersDown.length === 0) { this.lastPointerDidGetRemoved(); }
  }
};

TransformGesture.prototype.pointerCancel = function(event) {
  this.pointerUp(event);
};

TransformGesture.prototype.pointerMove = function(event) {
  if (this.pointersDown[event.pointerId]) {
    var entry = this.pointersDown[event.pointerId];
    entry.lastPosition = entry.position;
    entry.position = {x: event.clientX, y: event.clientY};

    this.sendGestureEventLater();
  }
};


// --- Before/After Changes to pointersDown Object/Array ---

(function() {

  // On addition of first pointer
  TransformGesture.prototype.firstPointerWillGetAdded = function() {
    this.baseTranslation = {x: 0, y: 0};
    this.baseScale = 1;
    this.baseRotation = 0;

    this.pointerBasePositions = {};
  };

  TransformGesture.prototype.firstPointerDidGetAdded = function() {
    this.sendGestureStartEvent();
  };


  // On removal of last pointer
  TransformGesture.prototype.lastPointerWillGetRemoved = function() {
  };

  TransformGesture.prototype.lastPointerDidGetRemoved = function() {
    clearTimeout(this.sendGestureEventTimeout);
    this.sendGestureEventTimeout = null;
    this.sendGestureEndEvent();
  };


  // On all changes
  var translationBefore = null;
  TransformGesture.prototype.pointersDownArrayWillChange = function() {
    this.baseTranslation = this.translation();
    this.baseScale = this.scale();
    this.baseRotation = this.rotation();

    /*
    translationBefore = this.translation();
    this.baseScale = this.scale();*/
  };

  TransformGesture.prototype.pointersDownArrayDidChange = function() {
    this.idsOfPointersDown.forEach(function(id) {
      this.pointerBasePositions[id] = this.pointersDown[id].position;
    }.bind(this));
    /*
    var translationAfter = this.translation();

    // Fix this.baseTranslation
    this.baseTranslation = addVectors(
      this.baseTranslation,
      subtractVectors(translationBefore,translationAfter)
    ); // => translationbefore == this.translation()

    this.baseAverageDistanceToCenter = this.averageDistanceToCenter();*/
  };

})();


// --- Gesture Events ---

TransformGesture.prototype.sendGestureStartEvent = function() {
  var event = document.createEvent('Event');
  event.initEvent('transformgesturestart', true, true);
  this.addTransformGestureEventValues(event);
  this.target.dispatchEvent(event);
};

TransformGesture.prototype.sendGestureEndEvent = function() {
  var event = document.createEvent('Event');
  event.initEvent('transformgesturestart', true, true);
  this.addTransformGestureEventValues(event);
  this.target.dispatchEvent(event);
};

TransformGesture.prototype.sendGestureEventLater = function() {
  // Don't go overboard with gesture events, max one per ms
  if (!this.sendGestureEventTimeout) {
    this.sendGestureEventTimeout = setTimeout(this.sendGestureEvent.bind(this), 1);
  }
};

TransformGesture.prototype.sendGestureEvent = function() {
  this.sendGestureEventTimeout = null;
  if (this.target) {
    var event = document.createEvent('Event');
    event.initEvent('transformgesture', true, true);
    this.addTransformGestureEventValues(event);
    this.target.dispatchEvent(event);
  }
};


// --- Gesture Event ---

TransformGesture.prototype.addTransformGestureEventValues = function(event) {
  event.pointersDownCount = this.idsOfPointersDown.length;

  var translation = this.translation();
  event.translationX = translation.x; event.translationY = translation.y;

  event.scale = this.scale();

  event.rotation = 0;
};

TransformGesture.prototype.translation = function() {
  return {x: 0, y: 0};
  var count = this.idsOfPointersDown.length,
      translation = {x: 0, y: 0};

  this.idsOfPointersDown.forEach(function(id) {
    var p = this.pointersDown[id];
    translation = addVectors(translation, subtractVectors(p.position, p.startPosition));
  }.bind(this));

  if (count > 1) { translation = {x: translation.x/count, y: translation.y/count}; }

  return addVectors(this.baseTranslation, translation);
};

TransformGesture.prototype.center = function() {
  var count = this.idsOfPointersDown.length;

  if (count === 0) { return null; }

  var center = {x: 0, y: 0};

  this.idsOfPointersDown.forEach(function(id) {
    center = addVectors(center, this.pointersDown[id].position);
  }.bind(this));

  return {x: center.x/count, y: center.y/count};
};

TransformGesture.prototype.averageDistanceToCenter = function() {
  var count = this.idsOfPointersDown.length;

  if (count === 0) { return null; }

  var center = this.center(),
      sumOfDistances = 0;

  this.idsOfPointersDown.forEach(function(id) {
    sumOfDistances += distance(this.pointersDown[id].position, center);
  }.bind(this));

  return sumOfDistances/count;
};

TransformGesture.prototype.scale = function() {
  return this.baseScale;

  var count = this.idsOfPointersDown.length;

  if (count >= 2) {
    return this.baseScale*(this.averageDistanceToCenter() / this.baseAverageDistanceToCenter);
  } else {
    return this.baseScale;
  }
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