var _ = require('lodash');

if(typeof(Proxy) !== 'undefined') {
  require('harmony-reflect');
} else {
  console.warn('You are running node without the --harmony flag. SchemaObject will work, but options strict: false and dotNotation: true will fail.')
}

// Is a number (ignores type).
var isNumeric = function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

// Used to fetch current values.
var getter = function(value, properties) {
  // Most calculations happen within the typecast and the value passed is typically the value we want to use.
  // Typically, the getter just returns the value.
  // Modifications to the value within the getter are not written to the object.

  // Return default value if present & current value is undefined -- do not write to object
  if(_.isUndefined(value) && !_.isUndefined(properties.default)) {
    value = typecast.call(this, (_.isFunction(properties.default) ? properties.default.call(this) : properties.default), value, properties);
  }

  return value;
};

// Used to write value to object.
var writeValue = function(value, fieldSchema) {
  // onBeforeValueSet allows you to cancel the operation.
  // It doesn't work like transform and others that allow you to modify the value because all typecast has already happened.
  // For use-cases where you need to modify the value, you can set a new value in the handler and return false.
  if(_.isFunction(this._options.onBeforeValueSet)) {
    if(this._options.onBeforeValueSet.call(this, value, fieldSchema.name) === false) {
      return;
    }
  }

  // Alias simply copies the value without actually writing it to alias index.
  // Because the value isn't actually set on the alias index, onValueSet isn't fired.
  if(fieldSchema.type === 'alias') {
    this[fieldSchema.index] = value;
    return;
  }

  // Write the value to the inner object.
  this._obj[fieldSchema.name] = value;

  // onValueSet notifies you after a value has been written.
  if(_.isFunction(this._options.onValueSet)) {
    this._options.onValueSet.call(this, value, fieldSchema.name);
  }
};

// Represents an error encountered when trying to set a value.
var SetterError = function(errorMessage, setValue, originalValue, fieldSchema) {
  this.errorMessage = errorMessage;
  this.setValue = setValue;
  this.originalValue = originalValue;
  this.fieldSchema = fieldSchema;
  return this;
};

// Returns typecasted value if possible. If rejected, originalValue is returned.
var typecast = function(value, originalValue, properties) {
  // Allow transform to manipulate raw properties.
  if(properties.transform) {
    value = properties.transform.call(this, value, originalValue, properties);
  }

  switch(properties.type) {
    case 'string':
      // Reject if object or array.
      if(_.isObject(value) || _.isArray(value)) {
        throw new SetterError('String type cannot typecast Object or Array types.', value, originalValue, properties);
      }

      // If index is being set with null or undefined, set value and end.
      if(_.isUndefined(value) || value === null) {
        return value;
      }

      // Typecast to String.
      value = value + '';

      // If stringTransform function is defined, use.
      // This is used before we do validation checks (except to be sure we have a string at all).
      if(properties.stringTransform) {
        value = properties.stringTransform.call(this, value, originalValue, properties);
      }

      // If clip property & maxLength properties are set, the string should be clipped.
      // This is basically a shortcut property that could be done with stringTransform.
      if(properties.clip && !_.isUndefined(properties.maxLength)) {
        value = value.substr(0, properties.maxLength);
      }

      // If enum is being used, be sure the value is within definition.
      if(_.isArray(properties.enum) && properties.enum.indexOf(value) === -1) {
        throw new SetterError('String does not exist in enum list.', value, originalValue, properties);
      }

      // If minLength is defined, check to be sure the string is > minLength.
      if(!_.isUndefined(properties.minLength) && value.length < properties.minLength) {
        throw new SetterError('String length too short to meet minLength requirement.', value, originalValue, properties);
      }

      // If maxLength is defined, check to be sure the string is < maxLength.
      if(!_.isUndefined(properties.maxLength) && value.length > properties.maxLength) {
        throw new SetterError('String length too long to meet maxLength requirement.', value, originalValue, properties);
      }

      // If regex is defined, check to be sure the string matches the regex pattern.
      if(properties.regex && !properties.regex.test(value)) {
        throw new SetterError('String does not match regular expression pattern.', value, originalValue, properties);
      }

      return value;
      break;

    case 'number':
      // Set values for boolean.
      if(_.isBoolean(value)) {
        value = value ? 1 : 0;
      }

      // Reject if array, object, or not numeric.
      if( _.isArray(value) || _.isObject(value) || !isNumeric(value)) {
        throw new SetterError('Number type cannot typecast Array or Object types.', value, originalValue, properties);
      }

      // Typecast to number.
      value = value * 1;

      // Transformation after typecasting but before validation and filters.
      if(properties.numberTransform) {
        value = properties.numberTransform.call(this, value, originalValue, properties);
      }

      if(!_.isUndefined(properties.min) && value < properties.min) {
        throw new SetterError('Number is too small to meet min requirement.', value, originalValue, properties);
      }

      if(!_.isUndefined(properties.max) && value > properties.max) {
        throw new SetterError('Number is too big to meet max requirement.', value, originalValue, properties);
      }

      return value;
      break;

    case 'boolean':
      // If is String and is 'false', return false.
      if(value === 'false') {
        return false;
      }

      // If is Number, <0 is true and >0 is false.
      if(isNumeric(value)) {
        return (value * 1) > 0 ? true : false;
      }

      // Use Javascript to eval and return boolean.
      value = value ? true : false;

      // Transformation after typecasting but before validation and filters.
      if(properties.booleanTransform) {
        value = properties.booleanTransform.call(this, value, originalValue, properties);
      }

      return value;
      break;

    case 'array':
      // If it's an object, typecast to an array and return array.
      if(_.isObject(value)) {
        value = _.toArray(value);
      }

      // Reject if not array.
      if(!_.isArray(value)) {
        throw new SetterError('Array type cannot typecast non-Array types.', value, originalValue, properties);
      }

      // Arrays are never set directly.
      // Instead, the values are copied over to the existing SchemaArray instance.
      // The SchemaArray is initialized immediately and will always exist.
      originalValue.length = 0;
      _.each(value, function(arrayValue) {
        originalValue.push(arrayValue);
      });

      return originalValue;
      break;

    case 'object':
      // If it's not an Object, reject.
      if(!_.isObject(value)) {
        throw new SetterError('Object type cannot typecast non-Object types.', value, originalValue, properties);
      }

      // If object is schema object and an entirely new object was passed, clear values and set.
      // This preserves the object instance.
      if(properties.objectType) {
        // The object will usually exist because it's initialized immediately for deep access within SchemaObjects.
        // However, in the case of Array elements, it will not exist.
        var schemaObject;
        if(!_.isUndefined(originalValue)) {
          // Clear existing values.
          schemaObject = originalValue;
          schemaObject.clear();
        } else {
          // The SchemaObject doesn't exist yet. Let's initialize a new one.
          // This is used for Array types.
          schemaObject = new properties.objectType;
        }

        // Copy value to SchemaObject and set value to SchemaObject.
        _.each(value, function(v, k) {
          schemaObject[k] = v;
        });
        value = schemaObject;
      }

      // Otherwise, it's OK.
      return value;
      break;

    case 'date':
      // Reject if object, array or boolean.
      if(!_.isDate(value) && !_.isString(value) && !_.isNumber(value)) {
        throw new SetterError('Date type cannot typecast Array or Object types.', value, originalValue, properties);
      }

      // Attempt to parse string value with Date.parse (which returns number of milliseconds).
      if(_.isString(value)) {
        value = Date.parse(value);
      }

      // If is timestamp, convert to Date.
      if(_.isNumber(value)) {
        value = new Date((value + '').length > 10 ? value : value * 1000);
      }

      // If the date couldn't be parsed, do not modify index.
      if(value == 'Invalid Date' || !_.isDate(value)) {
        throw new SetterError('Could not parse date.', value, originalValue, properties);
      }

      // Transformation after typecasting but before validation and filters.
      if(properties.dateTransform) {
        value = properties.dateTransform.call(this, value, originalValue, properties);
      }

      return value;
      break;

    default:
      return value;
      break;
  }
};

// Properties can be passed in multiple forms (an object, just a type, etc).
// Normalize to a standard format.
var normalizeProperties = function(properties, name) {
  // Allow for shorthand type declaration:

  // Check to see if the user passed in a raw type of a properties hash.
  if(properties) {
    // Raw type passed.
    // index: Type is translated to index: {type: Type}
    // Properties hash created.
    if(_.isUndefined(properties.type)) {
      properties = {type: properties};

    // Properties hash passed.
    // Copy properties hash before modifying.
    // Users can pass in their own custom types to the schema and we don't want to write to that object.
    // Especially since properties.name contains the index of our field and copying that will break functionality.
    } else {
      properties = _.extend({}, properties);
    }
  }

  // Type may be an object with properties.
  // If "type.type" exists, we'll assume it's meant to be properties.
  // This means that shorthand objects can't use the "type" index.
  // If "type" is necessary, they must be wrapped in a SchemaObject.
  if(_.isObject(properties.type) && !_.isUndefined(properties.type.type)) {
    _.each(properties.type, function(value, key) {
      if(_.isUndefined(properties[key])) {
        properties[key] = value;
      }
    });
    properties.type = properties.type.type;
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
      properties.arrayType = properties.type[0];
    }
    properties.type = 'array';
  }

  // index: {} or index: SchemaObject is translated to index: {type: Object, objectType: Type}
  // SchemaObject factory is initialized when raw schema is provided.
  if(!_.isString(properties.type)) {
    if(_.isFunction(properties.type)) {
      properties.objectType = properties.type;
      properties.type = 'object';
    } else if(_.isObject(properties.type)) {
      if(_.size(properties.type)) {
        properties.objectType = new SchemaObject(properties.type);
      }
      properties.type = 'object';
    }
  }

  // Set name if passed on properties.
  // It's used to show what field an error what generated on.
  if(name) {
    properties.name = name;
  }

  return properties;
};

// Add field to schema and initializes getter and setter for the field.
var addToSchema = function(index, properties) {
  this._schema[index] = normalizeProperties.call(this, properties, index);

  defineGetter.call(this, index, this._schema[index]);
  defineSetter.call(this, index, this._schema[index]);
};

// Defines getter for specific field.
var defineGetter = function(index, properties) {
  var self = this;

  // If the field type is an alias, we retrieve the value through the alias's index.
  var indexOrAliasIndex = properties.type === 'alias' ? properties.index : index;

  self.__defineGetter__(index, function() {
    try {
      return getter.call(self, self._obj[indexOrAliasIndex], properties);
    } catch(error) {
      // This typically happens when the default value isn't valid -- log error.
      self._errors.push(error);
    }
  });
};

// Defines setter for specific field.
var defineSetter = function(index, properties) {
  var self = this;

  this.__defineSetter__(index, function(value) {
    // Don't proceed if readOnly is true.
    if(properties.readOnly) {
      return;
    }

    try {
      // self._this[index] is used instead of this._obj[index] to route through the public interface.
      writeValue.call(self._this, typecast.call(self, value, self._this[index], properties), properties);
    } catch(error) {
      // Setter failed to validate value -- log error.
      self._errors.push(error);
    }
  });

  // Initialize object an array fields immediately:

  // Aliased fields reflect values on other fields and do not need to be initialized.
  if(properties.isAlias === true) {
    return;
  }

  // In case of object & array, they must be initialized immediately.
  if(properties.type === 'object') {
    if(properties.default) {
      writeValue.call(this._this, _.isFunction(properties.default) ? properties.default.call(this) : properties.default, properties);
    } else {
      writeValue.call(this._this, properties.objectType ? new properties.objectType : {}, properties);
    }

  // Native arrays are never used so that toArray can be globally supported.
  // Additionally, other properties such as unique rely on passing through SchemaObject.
  } else if(properties.type === 'array') {
    writeValue.call(this._this, new SchemaArray(this, properties), properties);
  }
};

// Reset field to default value.
var clearField = function(index, properties) {
  // Aliased fields reflect values on other fields and do not need to be cleared.
  if(properties.isAlias === true) {
    return;
  }

  // In case of object & array, they must be initialized immediately.
  if(properties.type === 'object') {
    this[properties.name].clear();
    if(properties.default) {
      this[properties.name] = _.isFunction(properties.default) ? properties.default.call(this) : properties.default;
    }

  // Native arrays are never used so that toArray can be globally supported.
  // Additionally, other properties such as unique rely on passing through SchemaObject.
  } else if(properties.type === 'array') {
    this[properties.name].length = 0;

  // Other field types can simply have their value set to the default (which might be undefined)
  } else {
    writeValue.call(this._this, properties.default, properties);
  }
};

// Represents a basic array with typecasted values.
var SchemaArray = function(self, properties) {
  this._self = self;
  this._properties = properties;

  if(this._properties.arrayType) {
    this._properties.arrayType = normalizeProperties.call(self, this._properties.arrayType);
  }
};
SchemaArray.prototype = new Array;
SchemaArray.prototype.push = function() {
  // Values are passed through the typecast before being allowed onto the array if arrayType is set.
  // In the case of rejection, the typecast returns undefined, which is not appended to the array.
  var values;
  if(this._properties.arrayType) {
    values = [].map.call(arguments, function(value) {
      return typecast.call(this._self, value, undefined, this._properties.arrayType);
    }, this);
  } else {
    values = arguments;
  }

  if(this._properties.unique) {
    values = _.difference(values, _.toArray(this));
  }

  var ret = [].push.apply(this, values);

  return ret;
};
SchemaArray.prototype.toArray = function() {
  // Create new Array to hold elements.
  var array = [];

  // Loop through each element, clone if necessary.
  _.each(this, function(element) {
    // Call toObject() method if defined (this allows us to return primitive objects instead of SchemaObjects).
    if(_.isObject(element) && _.isFunction(element.toObject)) {
      element = element.toObject();

    // If is non-SchemaType object, shallow clone so that properties modification don't have an affect on the original object.
    } else if(_.isObject(element)) {
      element = _.clone(element);
    }

    array.push(element);
  });

  return array;
};

// Represents an object with typed indexes.
var SchemaObject = function(schema, options) {
  // Create object for options if doesn't exist and merge with defaults.
  if(!options) {
    options = {};
  }
  options = _.extend({
    strict: true,
    dotNotation: false
  }, options);

  // Some of the options require the --harmony flag.
  if(typeof(Proxy) === 'undefined') {
    // If strict mode is off but the --harmony flag is not, fail.
    if(!options.strict) {
      throw 'Turning strict mode off requires --harmony flag.';
    }

    // If dot notation is on but the --harmony flag is not, fail.
    if(options.dotNotation) {
      throw 'Dot notation support requires --harmony flag.';
    }
  }

  // Represents an instance of the SchemaObject and should be bound to inherited schema.
  return function(defaults) {
    var self = this,
        obj;

    // Public version of ourselves.
    // Overwritten with proxy if available.
    self._this = self;

    // Object used to store properties internally.
    self._obj = obj = {};

    // Schema as defined by constructor.
    self._schema = schema;

    // Errors, retrieved with getErrors().
    self._errors = [];

    // Options need to be accessible to onValueSet.
    self._options = options;

    // Normalize schema properties to allow for various shorthand declarations.
    _.each(schema, function(properties, index) {
      schema[index] = normalizeProperties.call(self, properties, index);
    });

    // Define getters/typecasts based off of schema.
    _.each(schema, function(properties, index) {
      // Use getter / typecast to intercept and re-route, transform, etc.
      defineGetter.call(self, index, properties);
      defineSetter.call(self, index, properties);
    });

    // Return object without getter/typecasts, extra properties, etc.
    this.toObject = function() {
      var getObj = {};

      // Populate all properties in schema.
      _.each(schema, function(properties, index) {
        // Do not write values to object that are marked as writeOnly.
        if(properties.invisible) {
          return;
        }

        // Fetch value from self[index] to route through the public interface.
        var value = self._this[index];

        // If value does not need to be cloned, place in index.
        if((value === undefined || value === null)
        || properties.type !== 'object' && properties.type !== 'array' && properties.type !== 'date') {
          getObj[index] = value;

        // Clone Object
        } else if(properties.type === 'object') {
          // Call toObject() method if defined (this allows us to return primitive objects instead of SchemaObjects).
          if(_.isFunction(value.toObject)) {
            getObj[index] = value.toObject();

          // If is non-SchemaType object, shallow clone so that properties modification don't have an affect on the original object.
          } else if(_.isObject(value)) {
            getObj[index] = _.clone(value);
          }

        // Clone Array
        } else if(properties.type === 'array') {
          // Built in method to clone array to native type
          getObj[index] = value.toArray();

        // Clone Date object.
        } else if(properties.type === 'date') {
          // https://github.com/documentcloud/underscore/pull/863
          // _.clone doesn't work on Date object.
          getObj[index] = new Date(value.getTime());
        }
      });

      // If options contains toObject, pass through before returning final object.
      if(_.isFunction(this._options.toObject)) {
        getObj = this._options.toObject.call(this, getObj);
      }

      return getObj;
    };

    // toJSON is an interface used by JSON.stringify.
    // Return the raw object if called.
    this.toJSON = this.toObject;

    // Clear all values.
    this.clear = function() {
      _.each(self._schema, function(properties, index) {
        clearField.call(self._this, index, properties);
      });
    };

    // Get all errors.
    this.getErrors = function() {
      return self._errors;
    };

    // Clear all errors
    this.clearErrors = function() {
      self._errors = [];
    }

    // Harmony proxy used as interface to object allows to intercept all access.
    // Without Proxy we must register individual getter/typecasts to put any logic in place.
    // With Proxy, we still use the individual getter/typecasts, but also catch values that aren't in the schema.
    if(typeof(Proxy) !== 'undefined') {
      self._this = Proxy(self, {
        get: function(target, name, receiver) {
          if(options.dotNotation && name.indexOf('.') !== -1) {
            // Dot notation is on and the field name contains a dot.
            var fields = name.split('.'),
                result = self._obj;
            for (var i = 0, n = fields.length; i < n && result !== undefined; i++) {
              var field = fields[i];

              // If last in path, return the value.
              if(i === (n - 1)) {
                return result[field];
              } else {
                // The sub-object doesn't exist or isn't an object - return undefined.
                if(_.isUndefined(result[field]) || !_.isObject(result[field])) {
                  return undefined;
                }

                // Move onto next field.
                result = result[field];
              }
            }

            // For whatever reason, no value was found. Return undefined.
            return undefined;
          }

          // Using self routes to the registered getter without hitting the proxy and creating an infinite loop.
          return self[name];
        },
        set: function(target, name, value, receiver) {
          if(options.dotNotation && name.indexOf('.') !== -1) {
            // Dot notation is on and the field name contains a dot.
            var fields = name.split('.'),
                result = self._this;

            for (var i = 0, n = fields.length; i < n && result !== undefined; i++) {
              var field = fields[i];

              // If last in path, set value.
              if(i === (n - 1)) {
                result[field] = value;
              } else {
                // Create child object if it doesn't exist.
                if(_.isUndefined(result[field])) {
                  result[field] = {};
                }

                // If the field exists and isn't an object, abort.
                if(!_.isObject(result[field])) {
                  // TODO: We should throw a SetterError here, but this part of the typecast isn't wired to be able to throw errors.
                  return;
                }

                // Move onto next field.
                result = result[field];
              }
            }

            // Don't use typical handlers for any dot notation field.
            return;
          }

          if(!schema[name]) {
            if(options.strict) {
              // Strict mode means we don't want to deal with anything not in the schema.
              return;
            } else {
              // Add index to schema dynamically when value is set.
              // This is necessary for toObject to see the field.
              addToSchema.call(self, name, { type: 'any' });
            }
          }

          // This hits the registered setter but bypasses the proxy to avoid an infinite loop.
          self[name] = value;
        }
      });
    }

    // Populate runtime defaults as provided to this instance of object.
    // (Different than the default for each field - is simply a shortcut to populate values in object.)
    if(_.isObject(defaults)) {
      _.each(defaults, function(value, key) {
        self[key] = value;
      });
    };

    // If the proxy is available, we use that, otherwise fallback.
    return self._this;
  }
};

module.exports = SchemaObject;