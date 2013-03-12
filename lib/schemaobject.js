var _ = require('underscore')._;

// Helper functions:

// Is a number (ignores type).
var isNumeric = function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// Returns typecasted value if possible. If rejected, originalValue is returned.
var cast = function(value, originalValue, properties) {
  // Don't proceed if readOnly is true.
  if(properties.readOnly) {
    return originalValue;
  }

  // Allow transform to manipulate raw properties.
  if(properties.transform) {
    value = properties.transform.call(null, value, originalValue, properties);
  }

  switch(properties.type) {
    case 'string':
      // If Object, convert to array.
      if(_.isObject(value)) {
        value = _.toArray(value);
      }

      // If Array, join to string.
      if(_.isArray(value)) {
        value = value.join('');
      }

      // If index is being set with null or undefined, set value and end.
      if(_.isUndefined(value) || value == null) {
        return value;
      }

      // Typecast to String.
      value = value + '';

      // If stringTransform function is defined, use iproperties.
      // This is used before we do validation checks (except to be sure we have a string at all).
      if(properties.stringTransform) {
        value = properties.stringTransform.call(null, value, originalValue, properties);
      }

      if(
        // If enum is being used, be sure the value is within definition.
        (_.isArray(properties.enum) && properties.enum.indexOf(value) == -1)

        // If minLength is defined, check to be sure the string is > minLength
        || (!_.isUndefined(properties.minLength) && value.length < properties.minLength)

        // If regex is defined, check to be sure the string matches the regex pattern.
        || (properties.regex && !properties.regex.test(value))
      ) {
        // If the string doesn't meet requirements, it will remain untouched.
        return originalValue;
      }

      return value;
    break;

    case 'number':
      // Set values for boolean.
      if(_.isBoolean(value)) {
        value = value ? 1 : 0;
      }

      if(
        // Reject if array.
        _.isArray(value)

        // Reject if object.
        || _.isObject(value)

        // Reject if not numeric.
        || !isNumeric(value)
      ) {
         // If the value doesn't meet requirements, it will remain untouched.
        return originalValue;
      }

      // Typecast to number.
      value = value * 1;

      return value;
    break;

    case 'boolean':
      // If is String and is 'false', return false.
      if(_.isString(value) && value === 'false') {
        return false;
      }

      // If is Number, <0 is true and >0 is false.
      if(isNumeric(value)) {
        value = value * 1;
        return value > 0 ? true : false;
      }

      // Use Javascript to eval and return boolean.
      return value ? true : false;
    break;

    case 'array':
      // If it's an object, typecast to an array and return array.
      if(_.isObject(value)) {
        value = _.toArray(value);
      }

      // Reject if not array
      if(!_.isArray(value)) {
        // If the value doesn't meet requirements, it will remain untouched.
        return originalValue;
      }

      return value;
    break;

    case 'object':
      // If it's not an Object, reject.
      if(!_.isObject(value)) {
        // If the value doesn't meet requirements, it will remain untouched.
        return originalValue;
      }

      // If object is schema object and an entirely new object was passed, clear values and set.
      // This preserves the object instance.
      if(properties.objectType) {
        originalValue.clear();
        _.each(value, function(v, k) {
          originalValue[k] = v;
        });
        return originalValue;
      }

      // Otherwise, it's OK.
      return value;
    break;

    default:
      return value;
    break;
  }
};

// Properties can be passed in multiple forms (an object, just a type, etc).
// Normalize to a standard format.
var normalizeProperties = function(properties) {
  // Allow for shorthand type declaration:

  // index: Type is translated to index: {type: Type}
  if(properties && _.isUndefined(properties.type)) {
    properties = {type: properties};
  }

  // Null or undefined should be flexible and allow any value.
  if(properties.type === null || properties.type === undefined) {
    properties.type = 'any';

  // Convert object representation of type to lowercase string.
  // String is converted to 'string', Number to 'number', etc.
  } else if(properties.type.name) {
    properties.type = properties.type.name;
  }
  if(_.isString(properties.type)) {
    properties.type = properties.type.toLowerCase();
  }

  // index: [Type] or index: [] is translated to index: {type: Array, arrayType: Type}
  if(_.isArray(properties.type)) {
    if(_.size(properties.type)) {
      // Properties will be normalized when array is initialized.
      properties.arrayProperties = properties.type[0];
    }
    properties.type = 'array';
  }

  // index: {} or index: {schema: Type} or index: SchemaObject is translated to index: {type: Object, objectType: Type}
  // SchemaObject factory is initialized when raw schema is provided.
  if(!_.isString(properties.type)) {
    if(_.isFunction(properties.type)) {
      properties.objectType = properties.type;
      properties.type = 'object';
    } else if(properties.type == {}) {
      properties.type = 'object';
    } else if(_.isObject(properties.type) && _.size(properties.type)) {
      properties.objectType = new SchemaObject(properties.type);
      properties.type = 'object';
    }
  }

  return properties;
}

// Represents a basic array with typecasted values.
var SchemaArray = function(properties) {
  this._properties = _.clone(properties);
  this._properties = properties.arrayProperties;
  delete this._properties.arrayProperties;
  this._properties = normalizeProperties(this._properties);
}
SchemaArray.prototype = new Array;
SchemaArray.prototype.push = function() {
  var values = [].map.call(arguments, function(value) {
    return cast(value, undefined, this._properties);
  }, this);
  var ret = [].push.apply(this, values);
  return ret;
}

// Represents an object with typed indexes.
var SchemaObject = function(schema) {
  return function(defaults) {
    var self = this;

    // Object used to store properties internally.
    var obj;
    self._obj = obj = {};

    // Schema as defined by constructor.
    this._schema = schema;

    // Define getters/setters based off of schema.
    _.each(schema, function(properties, index) {
      // Normalize properties to allow for various shorthand declarations.
      schema[index] = properties = normalizeProperties(properties);

      // Getter / setter.
      self.__defineGetter__(index, function() {
        return obj[index];
      });
      self.__defineSetter__(index, function(value) {
        obj[index] = cast.call(null, value, self[index], properties);
      });

      // If value is object, the object should be initialized immediately.
      if(properties.type == 'object') {
        obj[index] = properties.objectType ? new properties.objectType : {};
      }

      // If value is array, the array should be initialized immediately.
      else if(properties.type == 'array') {
        obj[index] = properties.arrayProperties ? new SchemaArray(properties) : [];
      }

      // Set default value if present.
      if(!_.isUndefined(properties.default)) {
        var readOnly = properties.readOnly;
        properties.readOnly = false;
        self[index] = _.isFunction(properties.default) ? properties.default.call(self) : properties.default;
        properties.readOnly = readOnly;
      }
    });

    // Return raw object.
    this.toObject = function() {
      var getObj = {};

      // Populate all properties in schema.
      _.each(schema, function(properties, index) {
        var value = self[index];

        // If using SchemaType, call toObject() method.
        if(properties.objectType) {
          getObj[index] = value.toObject();

        // If is non-SchemaType object, shallow clone.
        } else if(_.isObject(value)) {
          getObj[index] = _.clone(value);

        // Otherwise, populate index with raw value - including undefined indexes.
        } else {
          getObj[index] = value;
        }
      });

      return getObj;
    }

    // Clear all values.
    this.clear = function() {
      self._obj = {};
    }

    // Populate runtime defaults as provided to this instance of object.
    // (Different than the default for each field - is simply a shortcut to populate values in object.)
    if(_.isObject(defaults)) {
      _.each(defaults, function(value, key) {
        self[key] = value;
      });
    };

    return self;
  }
}

module.exports = SchemaObject;