const _ = require('lodash');

// Without the --harmony and --harmony_proxies flags, options strict: false and dotNotation: true will fail with exception
if(typeof(Proxy) !== 'undefined') {
  require('harmony-reflect');
}

// If reflection is being used, our traps will hide internal properties.
// If reflection is not being used, Symbol will hide internal properties.
const _privateKey = typeof(Proxy) !== 'undefined' ? '_private' : Symbol('_private');

// Is a number (ignores type).
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// Used to fetch current values.
function getter(value, properties) {
  // Most calculations happen within the typecast and the value passed is typically the value we want to use.
  // Typically, the getter just returns the value.
  // Modifications to the value within the getter are not written to the object.

  // Return default value if present & current value is undefined -- do not write to object
  if(!_.isUndefined(properties.getter)) {
    value = typecast.call(this, properties.getter.call(this, value), value, properties);
  }

  return value;
}

// Used to write value to object.
function writeValue(value, fieldSchema) {
  // onBeforeValueSet allows you to cancel the operation.
  // It doesn't work like transform and others that allow you to modify the value because all typecast has already happened.
  // For use-cases where you need to modify the value, you can set a new value in the handler and return false.
  if(_.isFunction(this[_privateKey]._options.onBeforeValueSet)) {
    if(this[_privateKey]._options.onBeforeValueSet.call(this, value, fieldSchema.name) === false) {
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
  this[_privateKey]._obj[fieldSchema.name] = value;

  // onValueSet notifies you after a value has been written.
  if(_.isFunction(this[_privateKey]._options.onValueSet)) {
    this[_privateKey]._options.onValueSet.call(this, value, fieldSchema.name);
  }
}

// Represents an error encountered when trying to set a value.
class SetterError {
  constructor(errorMessage, setValue, originalValue, fieldSchema) {
    this.errorMessage = errorMessage;
    this.setValue = setValue;
    this.originalValue = originalValue;
    this.fieldSchema = fieldSchema;
  }
}

// Returns typecasted value if possible. If rejected, originalValue is returned.
function typecast(value, originalValue, properties) {
  // Allow transform to manipulate raw properties.
  if(properties.transform) {
    value = properties.transform.call(this, value, originalValue, properties);
  }

  // Property types are always normalized as lowercase strings despite shorthand definitions being available.
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
      _.each(value, (arrayValue) => {
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
        let schemaObject;
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
        for(const key in value) {
          schemaObject[key] = value[key];
        }
        value = schemaObject;
      }

      // Otherwise, it's OK.
      return value;
      break;

    case 'date':
      // If index is being set with null, undefined, or empty string: clear value and end.
      if(_.isUndefined(value) || value === null || value === '') {
        return undefined;
      }

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

    default: // 'any'
      return value;
      break;
  }
};

// Properties can be passed in multiple forms (an object, just a type, etc).
// Normalize to a standard format.
function normalizeProperties(properties, name) {
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
      properties = _.cloneDeep(properties);
    }
  }

  // Type may be an object with properties.
  // If "type.type" exists, we'll assume it's meant to be properties.
  // This means that shorthand objects can't use the "type" index.
  // If "type" is necessary, they must be wrapped in a SchemaObject.
  if(_.isObject(properties.type) && !_.isUndefined(properties.type.type)) {
    _.each(properties.type, (value, key) => {
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
  // Do not convert the initialized SchemaObjectInstance to a string!
  // Check for a shorthand declaration of schema by key length.
  } else if(_.isString(properties.type.name) && properties.type.name !== 'SchemaObjectInstance' && Object.keys(properties.type).length === 0) {
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
  if(!_.isString(properties.type)) {
    if(_.isFunction(properties.type)) {
      properties.objectType = properties.type;
      properties.type = 'object';
    } else if(_.isObject(properties.type)) {
      // When {} is passed, no schema is enforced.
      if(_.size(properties.type)) {
        // Options should be inherited by sub-SchemaObjects.
        properties.objectType = new SchemaObject(properties.type, this[_privateKey]._options);
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
function addToSchema(index, properties) {
  this[_privateKey]._schema[index] = normalizeProperties.call(this, properties, index);

  defineGetter.call(this[_privateKey]._getset, index, this[_privateKey]._schema[index]);
  defineSetter.call(this[_privateKey]._getset, index, this[_privateKey]._schema[index]);
};

// Defines getter for specific field.
function defineGetter(index, properties) {
  // If the field type is an alias, we retrieve the value through the alias's index.
  let indexOrAliasIndex = properties.type === 'alias' ? properties.index : index;

  this.__defineGetter__(index, () => {
    try {
      return getter.call(this, this[_privateKey]._obj[indexOrAliasIndex], properties);
    } catch(error) {
      // This typically happens when the default value isn't valid -- log error.
      this[_privateKey]._errors.push(error);
    }
  });
};

// Defines setter for specific field.
function defineSetter(index, properties) {
  this.__defineSetter__(index, (value) => {
    // Don't proceed if readOnly is true.
    if(properties.readOnly) {
      return;
    }

    try {
      // this[_privateKey]._this[index] is used instead of this[_privateKey]._obj[index] to route through the public interface.
      writeValue.call(this[_privateKey]._this, typecast.call(this, value, this[_privateKey]._this[index], properties), properties);
    } catch(error) {
      // Setter failed to validate value -- log error.
      this[_privateKey]._errors.push(error);
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
      writeValue.call(this[_privateKey]._this, _.isFunction(properties.default) ? properties.default.call(this) : properties.default, properties);
    } else {
      writeValue.call(this[_privateKey]._this, properties.objectType ? new properties.objectType : {}, properties);
    }

  // Native arrays are never used so that toArray can be globally supported.
  // Additionally, other properties such as unique rely on passing through SchemaObject.
  } else if(properties.type === 'array') {
    writeValue.call(this[_privateKey]._this, new SchemaArray(this, properties), properties);
  }
};

// Reset field to default value.
function clearField(index, properties) {
  // Aliased fields reflect values on other fields and do not need to be cleared.
  if(properties.isAlias === true) {
    return;
  }

  // In case of object & array, they must be initialized immediately.
  if(properties.type === 'object') {
    this[properties.name].clear();

  // Native arrays are never used so that toArray can be globally supported.
  // Additionally, other properties such as unique rely on passing through SchemaObject.
  } else if(properties.type === 'array') {
    this[properties.name].length = 0;

  // Other field types can simply have their value set to undefined.
  } else {
    writeValue.call(this[_privateKey]._this, undefined, properties);
  }
};

// Represents a basic array with typecasted values.
class SchemaArray extends Array {
  constructor(self, properties) {
    super();

    // Store all internals.
    const _private = this[_privateKey] = {};

    // Store reference to self.
    _private._self = self;

    // Store properties (arrayType, unique, etc).
    _private._properties = properties;

    // Normalize our own properties.
    if(properties.arrayType) {
      properties.arrayType = normalizeProperties.call(self, properties.arrayType);
    }
  }

  push() {
    // Values are passed through the typecast before being allowed onto the array if arrayType is set.
    // In the case of rejection, the typecast returns undefined, which is not appended to the array.
    let values;
    if(this[_privateKey]._properties.arrayType) {
      values = [].map.call(arguments, (value) => {
        return typecast.call(this[_privateKey]._self, value, undefined, this[_privateKey]._properties.arrayType);
      }, this);
    } else {
      values = arguments;
    }

    if(this[_privateKey]._properties.unique) {
      values = _.difference(values, _.toArray(this));
    }

    return Array.prototype.push.apply(this, values);
  }

  toArray() {
    // Create new Array to hold elements.
    const array = [];

    // Loop through each element, clone if necessary.
    _.each(this, (element) => {
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
  }

  toJSON() {
    return this.toArray();
  }
}

// Represents an object FACTORY with typed indexes.
class SchemaObject {
  constructor(schema, options = {}) {
    const SO = SchemaObjectInstanceFactory(schema, options);

    // Add custom constructors.
    _.each(options.constructors, (constructor, key) => {
      SO[key] = function() {
        const obj = new SO();
        constructor.apply(obj, arguments);
        return obj;
      };
    });

    return SO;
  }
}

// Represents an object INSTANCE factory with typed indexes.
function SchemaObjectInstanceFactory(schema, options) {
  // Create object for options if doesn't exist and merge with defaults.
  options = _.extend({
    // By default, allow only values in the schema to be set.
    // When this is false, setting new fields will dynamically add the field to the schema as type "any". 
    strict: true,

    // Allow fields to be set via dotNotation; obj['user.name'] = 'Scott'; -> obj: { user: 'Scott' }
    dotNotation: false,

    // Do not set undefined values to keys within toObject().
    // This is the default because MongoDB will convert undefined to null and overwrite existing values.
    // If this is true, toObject() will output undefined for unset primitives and empty arrays/objects for those types.
    // If this is false, toObject() will not output any keys for unset primitives, arrays, and objects.
    setUndefined: false
  }, options);

  // Some of the options require the --harmony flag.
  if(typeof(Proxy) === 'undefined') {
    // If strict mode is off but the --harmony flag is not, fail.
    if(!options.strict) {
      throw new Error('Turning strict mode off requires --harmony flag.');
    }

    // If dot notation is on but the --harmony flag is not, fail.
    if(options.dotNotation) {
      throw new Error('Dot notation support requires --harmony flag.');
    }
  }

  // Represents an actual instance of an object.
  class SchemaObjectInstance {
    constructor(defaults) {
      // Object used to store internals.
      const _private = this[_privateKey] = {};

      // Object with getters and setters bound.
      _private._getset = this;

      // Public version of ourselves.
      // Overwritten with proxy if available.
      _private._this = this;

      // Object used to store raw values.
      const obj = _private._obj = {};

      // Schema as defined by constructor.
      _private._schema = schema;

      // Errors, retrieved with getErrors().
      _private._errors = [];

      // Options need to be accessible to onValueSet.
      _private._options = options;

      // Normalize schema properties to allow for shorthand declarations.
      _.each(schema, (properties, index) => {
        schema[index] = normalizeProperties.call(this, properties, index);
      });

      // Define getters/typecasts based off of schema.
      _.each(schema, (properties, index) => {
        // Use getter / typecast to intercept and re-route, transform, etc.
        defineGetter.call(_private._getset, index, properties);
        defineSetter.call(_private._getset, index, properties);
      });

      // Proxy used as interface to object allows to intercept all access.
      // Without Proxy we must register individual getter/typecasts to put any logic in place.
      // With Proxy, we still use the individual getter/typecasts, but also catch values that aren't in the schema.
      if(typeof(Proxy) !== 'undefined') {
        const proxy = this[_privateKey]._this = new Proxy(this, {
          // Ensure only public keys are shown
          ownKeys: (target) => {
            return Object.keys(schema);
          },

          // Return keys to iterate
          enumerate: (target) => {
            return Object.keys(proxy)[Symbol.iterator]();
          },

          // Check to see if key exists
          has: (target, key) => {
            return !!schema[key];
          },

          // Ensure correct prototype is returned.
          getPrototypeOf: () => {
            return _private._getset;
          },

          // Ensure readOnly fields are not writeable.
          getOwnPropertyDescriptor: (target, key) => {
            return {
              value: proxy[key],
              writeable: schema[key].readOnly !== true,
              enumerable: true,
              configurable: true
            };
          },

          // Intercept all get calls.
          get: (target, name, receiver) => {
            // Support dot notation via lodash.
            if(options.dotNotation && name.indexOf('.') !== -1) {
              return _.get(this[_privateKey]._this, name);
            }

            // Using self routes to the registered getter without hitting the proxy and creating an infinite loop.
            return this[name];
          },

          // Intercept all set calls.
          set: (target, name, value, receiver) => {
            // Support dot notation via lodash.
            if(options.dotNotation && name.indexOf('.') !== -1) {
              return _.set(this[_privateKey]._this, name, value);
            }

            if(!schema[name]) {
              if(options.strict) {
                // Strict mode means we don't want to deal with anything not in the schema.
                // TODO: SetterError here.
                return;
              } else {
                // Add index to schema dynamically when value is set.
                // This is necessary for toObject to see the field.
                addToSchema.call(this, name, {type: 'any'});
              }
            }

            // This hits the registered setter but bypasses the proxy to avoid an infinite loop.
            this[name] = value;
          }
        });
      }

      // Populate schema defaults into object.
      _.each(schema, (properties, index) => {
        if(properties.default !== undefined) {
          // Temporarily ensure readOnly is turned off to prevent the set from failing.
          const readOnly = properties.readOnly;
          properties.readOnly = false;
          this[index] = _.isFunction(properties.default) ? properties.default.call(this) : properties.default;
          properties.readOnly = readOnly;
        }
      });

      // Populate runtime defaults as provided to this instance of object.
      // (Different than the default for each field - is simply a shortcut to populate values in object.)
      if(_.isObject(defaults)) {
        _.each(defaults, (value, key) => {
          this[key] = value;
        });
      };

      // May return actual object instance or Proxy, depending on harmony support.
      return this[_privateKey]._this;
    }

    // Return object without getter/typecasts, extra properties, etc.
    toObject() {
      const options = this[_privateKey]._options;
      let getObj = {};

      // Populate all properties in schema.
      _.each(this[_privateKey]._schema, (properties, index) => {
        // Do not write values to object that are marked as writeOnly.
        if(properties.invisible) {
          return;
        }

        // Fetch value from self[index] to route through the public interface.
        let value = this[_privateKey]._this[index];

        // Do not write undefined values to the object because of strange behavior when using with MongoDB.
        // MongoDB will convert undefined to null and overwrite existing values in that field.
        if(value === undefined && options.setUndefined !== true) {
          return;
        }

        // TODO: Track dirty state on automatically initialized arrays and objects, do not write if untouched.

        // If value does not need to be cloned (is primitive), place in index.
        if((value === undefined || value === null)
        || properties.type !== 'object' && properties.type !== 'array' && properties.type !== 'date') {
          getObj[index] = value;

        // Clone Object
        } else if(properties.type === 'object') {
          // Call toObject() method if defined (this allows us to return primitive objects instead of SchemaObjects).
          if(_.isFunction(value.toObject)) {
            value = value.toObject();

          // If is non-SchemaType object, shallow clone so that properties modification don't have an affect on the original object.
          } else if(_.isObject(value)) {
            value = _.clone(value);
          }

          // Set non-empty object
          if(!options.setUndefined && !_.size(value)) {
            return;
          }
          getObj[index] = value;

        // Clone Array
        } else if(properties.type === 'array') {
          // Built in method to clone array to native type
          value = value.toArray();

          // Set non-empty array
          if(!options.setUndefined && !_.size(value)) {
            return;
          }
          getObj[index] = value;

        // Clone Date object.
        } else if(properties.type === 'date') {
          // https://github.com/documentcloud/underscore/pull/863
          // _.clone doesn't work on Date object.
          getObj[index] = new Date(value.getTime());
        }
      });

      // If options contains toObject, pass through before returning final object.
      if(_.isFunction(options.toObject)) {
        getObj = options.toObject.call(this, getObj);
      }

      return getObj;
    }

    // toJSON is an interface used by JSON.stringify.
    // Return the raw object if called.
    toJSON() {
      return this.toObject();
    }

    // Clear all values.
    clear() {
      _.each(this[_privateKey]._schema, (properties, index) => {
        clearField.call(this[_privateKey]._this, index, properties);
      });
    }

    // Get all errors.
    getErrors() {
      return this[_privateKey]._errors;
    }

    // Clear all errors
    clearErrors() {
      this[_privateKey]._errors.length = 0;
    }

    // Has errors?
    isErrors() {
      return !!this[_privateKey]._errors.length;
    }
  }

  // Add custom methods to factory-generated class.
  _.each(options.methods, (method, key) => {
    if(SchemaObjectInstance.prototype[key]) {
      throw new Error(`Cannot overwrite existing ${key} method with custom method.`);
    }
    SchemaObjectInstance.prototype[key] = method;
  });

  return SchemaObjectInstance;
}

module.exports = SchemaObject;