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
    // Before
    this.commitTransformationToBaseTransformation()

    // Add
    this.storePointerInfoFromEvent(event)
    this.idsOfPointersDown.push(event.pointerId)

    // After
    this.cache = null
    this.grabNewReferenceValues()
    if(this.idsOfPointersDown.length === 1) { // Is first pointer
      this.sendGestureStartEvent()
    }
  }
}

TransformGesture.prototype.pointerUp = function(event) {
  if (this.pointersDown[event.pointerId]) {
    // Before
    this.commitTransformationToBaseTransformation()

    // Remove
    delete this.pointersDown[event.pointerId]
    var index = this.idsOfPointersDown.indexOf(event.pointerId)
    this.idsOfPointersDown.splice(index, 1)

    // After
    this.cache = null
    this.grabNewReferenceValues()
    if(this.idsOfPointersDown.length === 0) { // Was last pointer
      this.doNotSendGestureChangeEventLater()
      this.sendGestureEndEvent()
    }
  }
}

TransformGesture.prototype.pointerCancel = function(event) {
  this.pointerUp(event)
}

TransformGesture.prototype.pointerMove = function(event) {
  if (this.pointersDown[event.pointerId]) { // Is it a pointer for this gesture?
    this.storePointerInfoFromEvent(event)
    this.cache = null
    this.sendGestureChangeEventLater()
  }
}

// Used in addPointer and pointerMove
TransformGesture.prototype.storePointerInfoFromEvent = function(event) {
  var position = new Vector2D(event.clientX, event.clientY)
  this.pointersDown[event.pointerId] = {
    position: new Vector2D(this.coordinateTransformation(position))
  }
}



// --- Events ---

TransformGesture.prototype.sendGestureStartEvent = function() {
  this.sendEvent('transformgesturestart')
}

TransformGesture.prototype.sendGestureEndEvent = function() {
  this.sendEvent('transformgestureend')
}

function sendGestureChangeEvent() {
  this.sendGestureEventChangeTimeout = null
  this.sendEvent("transformgesturechange")
}

TransformGesture.prototype.sendGestureChangeEventLater = function() {
  // Don't go overboard with gesture events, max one per ms
  if (!this.sendGestureEventChangeTimeout) { // None scheduled, yet?
    this.sendGestureEventChangeTimeout =
      setTimeout(sendGestureChangeEvent.bind(this), 1)
  }
}

TransformGesture.prototype.doNotSendGestureChangeEventLater = function() {
  clearTimeout(this.sendGestureEventChangeTimeout)
  this.sendGestureEventChangeTimeout = null
}


TransformGesture.prototype.sendEvent = function(eventName) {
  if (this.eventTarget) {
    var event = document.createEvent('Event')
    event.initEvent(eventName, true, true)
    event.gesture = this
    this.eventTarget.dispatchEvent(event)
  }
}



// --- Calculations ---

TransformGesture.prototype.commitTransformationToBaseTransformation = function() {
  this.baseTranslation = this.translation
  this.baseScale = this.scale
  this.baseRotation = this.rotation
}

TransformGesture.prototype.grabNewReferenceValues = function() {
  this.referencePointersCenter = this.pointersCenter
  this.referenceSumOfDistancesToPointersCenter = this.sumOfDistancesToPointersCenter
  this.referenceGreatestPointersDistanceInfo = this.greatestPointersDistanceInfo
}

defineProperty("pointersCenter", { get: useCaching(function() {
  var count = this.idsOfPointersDown.length

  if (count === 0) { return null }

  var sum = this.idsOfPointersDown.reduce(function(sum, id) {
    return sum.add(this.pointersDown[id].position)
  }.bind(this), new Vector2D(0, 0))

  // Note: this.lastCenter is used in addValuesToEvent()
  return (this.lastCenter = new Vector2D(sum.x/count, sum.y/count))
})})

defineProperty("sumOfDistancesToPointersCenter", { get: useCaching(function() {
  if (this.idsOfPointersDown.length === 0) { return null }

  var pointersCenter = this.pointersCenter

  return this.idsOfPointersDown.reduce(function(sum, id) {
    return sum + this.pointersDown[id].position.distanceTo(pointersCenter)
  }.bind(this), 0)
})})

defineProperty("greatestPointersDistanceInfo", { get: useCaching(function() {
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
})})

// Scaling relative to base
defineProperty("interimScale", { get: useCaching(function() {
  var count = this.idsOfPointersDown.length
  return (this.canScale && count >= 2) ? (this.sumOfDistancesToPointersCenter /
                                          this.referenceSumOfDistancesToPointersCenter) : 1
})})

defineProperty("interimRotation", { get: useCaching(function() {
  if (this.canRotate && this.idsOfPointersDown.length >= 2) {

    var refInfo = this.referenceGreatestPointersDistanceInfo,
        pos1 = this.pointersDown[refInfo.id1].position,
        pos2 = this.pointersDown[refInfo.id2].position,
        v = pos1.subtract(pos2)
    return Math.atan2(v.y,v.x) - refInfo.angle

  } else {
    return 0
  }
})})



// --- Translation, scale, rotation ---

defineProperty("translation", { get: useCaching(function() {
  var pointersCenter = this.pointersCenter

  // Note: This function is also called when no pointers are on screen
  // => no pointersCenter and no translation
  if (pointersCenter) {
    var referencePointersCenterToBaseTrans =
          this.baseTranslation.subtract(this.referencePointersCenter),
        pointersCenterToTrans =
          referencePointersCenterToBaseTrans.rotateClockwise(-this.interimRotation)
                                       .scale(this.interimScale)

    return pointersCenter.add(pointersCenterToTrans)
  } else {
    return this.baseTranslation
  }
})})
defineProperty("translationX", { get: function() { return this.translation.x }})
defineProperty("translationY", { get: function() { return this.translation.y }})

defineProperty("scale", { get: function() {
  return this.baseScale*this.interimScale
}})

defineProperty("rotation", { get: function() {
  return this.baseRotation + this.interimRotation
}})



// --- Vector2D Helper Class ---

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
  return Math.sqrt(Math.pow(this.x - vec.x, 2) + Math.pow(this.y - vec.y, 2))
}

Vector2D.prototype.scale = function(factor) {
  return new Vector2D(this.x*factor, this.y*factor)
}

Vector2D.prototype.rotateClockwise = function(radians) {
  var sin = Math.sin, cos = Math.cos
  return new Vector2D( this.x*cos(radians) + this.y*sin(radians),
                      -this.x*sin(radians) + this.y*cos(radians))
}



// --- Caching ---

// Use simple caching to avoid recalculations if no pointers changed
// Note: `this.cache = null` clears the cache
function useCaching(func) {
  var cacheIndex
  return function() {
    if (!this.cache) { this.cache = {} }
    if (!this.cacheIndexCounter) { this.cacheIndexCounter = 1 }
    if (!cacheIndex) { cacheIndex = this.cacheIndexCounter++ }

    return this.cache[cacheIndex] ? this.cache[cacheIndex] :
                                    this.cache[cacheIndex] = func.apply(this)
  }
}


export default TransformGesture