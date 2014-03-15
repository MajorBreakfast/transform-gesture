/* global console, clearTimeout, setTimeout, window */

// Constructor
var TransformGesture = function(options) {
  // Initial values
  this.baseTranslation = new Vector2D(0, 0)
  this.baseScale = 1
  this.baseRotation = 0
  this.coordinateTransformation = function(vector) { return vector }
  this.canRotate = false
  this.canScale = false

  // Set options
  if (options instanceof Object) {
    var fields = ['eventTarget', 'coordinateTransformation',
                'canTranslate', 'canRotate', 'canScale']
    fields.forEach(function(field) {
      if (options[field] !== undefined) { this[field] = options[field] }
    }.bind(this))
  }

  // For remembering which pointers are on screen
  this.pointersDown = {}
  this.idsOfPointersDown = []

  // Events
  document.addEventListener("pointermove", this.pointerMove.bind(this))
  document.addEventListener("pointerup", this.pointerUp.bind(this))
  document.addEventListener("pointercancel", this.pointerCancel.bind(this))
}

// Shorthand for Object.defineProperty with first param preset to the prototype
var defineProperty = Object.defineProperty.bind(null, TransformGesture.prototype)


// --- Event Handlers ---

// Supposed to be called from the outside in a pointerdown event handler
TransformGesture.prototype.addPointer = function(event) {
  if (this.pointersDown[event.pointerId]) {
    console.warn('Transform Gesture: Discovered pointer that was not ' +
                 'properly removed.')
  } else {
    // Notify before
    if(this.idsOfPointersDown.length === 0) { this.firstPointerWillGetAdded() }
    this.pointersDownArrayWillChange()

    // Add
    this.pointersDown[event.pointerId] = this.extractEventValues(event)
    this.idsOfPointersDown.push(event.pointerId)

    // Notify after
    this.pointersDownArrayDidChange()
    if(this.idsOfPointersDown.length === 1) { this.firstPointerDidGetAdded() }
  }
}

TransformGesture.prototype.pointerUp = function(event) {
  if (this.pointersDown[event.pointerId]) {
    // Notify before
    if(this.idsOfPointersDown.length === 1) { this.lastPointerWillGetRemoved() }
    this.pointersDownArrayWillChange()

    // Remove
    delete this.pointersDown[event.pointerId]
    var index = this.idsOfPointersDown.indexOf(event.pointerId)
    this.idsOfPointersDown.splice(index, 1)

    // Notify after
    this.pointersDownArrayDidChange()
    if(this.idsOfPointersDown.length === 0) { this.lastPointerDidGetRemoved() }
  }
}

TransformGesture.prototype.pointerCancel = function(event) {
  this.pointerUp(event)
}

TransformGesture.prototype.pointerMove = function(event) {
  if (this.pointersDown[event.pointerId]) { // Is it a pointer for this gesture?
    // Update
    this.pointersDown[event.pointerId] = this.extractEventValues(event)

    // Send event
    this.sendGestureChangeEventLater()
  }
}


// Used in addPointer and pointerUp
TransformGesture.prototype.extractEventValues = function(event) {
  var position = new Vector2D(event.clientX, event.clientY)
  return {
    position: new Vector2D(this.coordinateTransformation(position))
  }
}



// --- Before/After Changes to pointersDown Object/Array ---

// On addition of first pointer
TransformGesture.prototype.firstPointerWillGetAdded = function() {
}

TransformGesture.prototype.firstPointerDidGetAdded = function() {
  this.sendGestureStartEvent()
}


// On removal of last pointer
TransformGesture.prototype.lastPointerWillGetRemoved = function() {
}

TransformGesture.prototype.lastPointerDidGetRemoved = function() {
  // Explicitly unschedule the possibly scheduled further gesture event
  clearTimeout(this.sendGestureEventChangeTimeout)
  this.sendGestureEventChangeTimeout = null

  // End event
  this.sendGestureEndEvent()
}


// On all pointer additions/removals
TransformGesture.prototype.pointersDownArrayWillChange = function() {
  this.baseTranslation = this.translation
  this.baseScale = this.scale
  this.baseRotation = this.rotation
}

TransformGesture.prototype.pointersDownArrayDidChange = function() {
  this.basePointersCenter = this.pointersCenter
  this.baseSumOfDistancesToPointersCenter = this.sumOfDistancesToPointersCenter
  this.baseGreatestPointersDistanceInfo = this.greatestPointersDistanceInfo
}



// --- Events ---

// Start event
TransformGesture.prototype.sendGestureStartEvent = function() {
  if (this.eventTarget) {
    var event = document.createEvent('Event')
    event.initEvent('transformgesturestart', true, true)
    this.addValuesToEvent(event)
    this.eventTarget.dispatchEvent(event)
  }
}


// End event
TransformGesture.prototype.sendGestureEndEvent = function() {
  if (this.eventTarget) {
    var event = document.createEvent('Event')
    event.initEvent('transformgestureend', true, true)
    this.addValuesToEvent(event)
    this.eventTarget.dispatchEvent(event)
  }
}


// Change event
TransformGesture.prototype.sendGestureChangeEventLater = function() {
  // Don't go overboard with gesture events, max one per ms
  if (!this.sendGestureEventChangeTimeout) { // None scheduled, yet?
    this.sendGestureEventChangeTimeout =
      setTimeout(this.sendGestureChangeEvent.bind(this), 1)
  }
}

TransformGesture.prototype.sendGestureChangeEvent = function() {
  this.sendGestureEventChangeTimeout = null

  if (this.eventTarget) {
    var event = document.createEvent('Event')
    event.initEvent('transformgesture', true, true)
    this.addValuesToEvent(event)
    this.eventTarget.dispatchEvent(event)
  }
}


// Adds event values (used in all events)
TransformGesture.prototype.addValuesToEvent = function(event) {
  event.pointersCount = this.idsOfPointersDown.length

  var translation = this.translation
  event.translationX = translation.x
  event.translationY = translation.y

  event.scale = this.scale

  event.rotation = this.rotation

  var pointersCenter = this.pointersCenter || this.lastCenter
  event.pointersCenterX = pointersCenter.x
  event.pointersCenterY = pointersCenter.y
}



// --- Intermediate calculations ---

defineProperty("pointersCenter", { get: function() {
  var count = this.idsOfPointersDown.length

  if (count === 0) { return null }

  var sum = this.idsOfPointersDown.reduce(function(sum, id) {
    return sum.add(this.pointersDown[id].position)
  }.bind(this), new Vector2D(0, 0))

  // Note: this.lastCenter is used in addValuesToEvent()
  return (this.lastCenter = new Vector2D(sum.x/count, sum.y/count))
}})

defineProperty("sumOfDistancesToPointersCenter", { get: function() {
  if (this.idsOfPointersDown.length === 0) { return null }

  var pointersCenter = this.pointersCenter

  return this.idsOfPointersDown.reduce(function(sum, id) {
    return sum + this.pointersDown[id].position.distanceTo(pointersCenter)
  }.bind(this), 0)
}})

defineProperty("greatestPointersDistanceInfo", { get: function() {
  return this.idsOfPointersDown.reduce(function(info, id1) {
    return this.idsOfPointersDown.reduce(function(info, id2) {
      if (id1 >= id2) { return info } // => Don't check twice

      var newInfo = {
        id1: id1,
        id2: id2,
        position1: this.pointersDown[id1].position,
        position2: this.pointersDown[id2].position
      }

      newInfo.distance = newInfo.position1.distanceTo(newInfo.position2)

      if (newInfo.distance > info.distance) {
        var v = newInfo.position1.subtract(newInfo.position2)
        newInfo.angle = Math.atan2(v.y,v.x)
        return newInfo
      } else { return info }
    }.bind(this), info)
  }.bind(this), {distance: 0, pointerId1: null, pointerId2: null})
}})

// Scaling relative to base
defineProperty("interimScale", { get: function() {
  var count = this.idsOfPointersDown.length
  return (this.canScale && count >= 2) ? (this.sumOfDistancesToPointersCenter /
                                          this.baseSumOfDistancesToPointersCenter) : 1
}})

defineProperty("interimRotation", { get: function() {
  if (this.canRotate && this.idsOfPointersDown.length >= 2) {

    var refInfo = this.baseGreatestPointersDistanceInfo,
        pos1 = this.pointersDown[refInfo.id1].position,
        pos2 = this.pointersDown[refInfo.id2].position,
        v = pos1.subtract(pos2)
    return Math.atan2(v.y,v.x) - refInfo.angle

  } else {
    return 0
  }
}})



// --- Translation, scale, rotation ---

defineProperty("translation", { get: function() {
  var pointersCenter = this.pointersCenter

  // Note: This function is also called when no pointers are on screen
  // => no pointersCenter and no translation
  if (pointersCenter) {
    var basePointersCenterToBaseTrans =
          this.baseTranslation.subtract(this.basePointersCenter),
        pointersCenterToTrans =
          basePointersCenterToBaseTrans.rotateClockwise(-this.interimRotation)
                                       .scale(this.interimScale)

    return pointersCenter.add(pointersCenterToTrans)
  } else {
    return this.baseTranslation
  }
}})

defineProperty("scale", { get: function() {
  return this.baseScale*this.interimScale
}})

defineProperty("rotation", { get: function() {
  return this.baseRotation + this.interimRotation
}})



// --- Helpers ---

var Vector2D = function(x,y) {
  if (x instanceof Object) {
    this.x = x.x; this.y = x.y
  } else {
    this.x = x; this.y = y
  }
}

Vector2D.prototype.add = function(vec) {
  return new Vector2D(this.x + vec.x, this.y + vec.y)
}

Vector2D.prototype.subtract = function(vec) {
  return new Vector2D(this.x - vec.x, this.y - vec.y)
}

Vector2D.prototype.distanceTo = function(vec) {
  var a = this.x - vec.x,
      b = this.y - vec.y
  return Math.sqrt(a*a + b*b)
}

Vector2D.prototype.scale = function(factor) {
  return new Vector2D(this.x*factor, this.y*factor)
}

Vector2D.prototype.rotateClockwise = function(radians) {
  var sin = Math.sin, cos = Math.cos
  return new Vector2D( this.x*cos(radians) + this.y*sin(radians),
                      -this.x*sin(radians) + this.y*cos(radians))
}

export default TransformGesture