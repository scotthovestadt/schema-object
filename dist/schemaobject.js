'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _extendableBuiltin(cls) {
    function ExtendableBuiltin() {
        var instance = Reflect.construct(cls, Array.from(arguments));
        Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
        return instance;
    }

    ExtendableBuiltin.prototype = Object.create(cls.prototype, {
        constructor: {
            value: cls,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });

    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(ExtendableBuiltin, cls);
    } else {
        ExtendableBuiltin.__proto__ = cls;
    }

    return ExtendableBuiltin;
}

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function (_) {
    'use strict';

    var _isProxySupported = typeof Proxy !== 'undefined' && Proxy.toString().indexOf('proxies not supported on this platform') === -1;

    // Use require conditionally, otherwise assume global dependencies.
    if (typeof require !== 'undefined') {
        _ = require('lodash');

        if (!global._babelPolyfill) {
            // Necessary to do this instead of runtime transformer for browser compatibility.
            require('babel-polyfill');
        }

        // Patch the harmony-era (pre-ES6) Proxy object to be up-to-date with the ES6 spec.
        // Without the --harmony and --harmony_proxies flags, options strict: false and dotNotation: true will fail with exception.
        if (_isProxySupported === true) {
            require('harmony-reflect');
        }
    } else {
        _ = window._;
    }

    // If reflection is being used, our traps will hide internal properties.
    // If reflection is not being used, Symbol will hide internal properties.
    var _privateKey = _isProxySupported === true ? '_private' : Symbol('_private');

    // Reserved fields, map to internal property.
    var _reservedFields = ['super'];

    // Is a number (ignores type).
    function isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    // Used to get real index name.
    function getIndex(index) {
        if (this[_privateKey]._options.keysIgnoreCase && typeof index === 'string') {
            var indexLowerCase = index.toLowerCase();
            for (var key in this[_privateKey]._schema) {
                if (typeof key === 'string' && key.toLowerCase() === indexLowerCase) {
                    return key;
                }
            }
        }

        return index;
    }

    // Used to fetch current values.
    function getter(value, properties) {
        // Most calculations happen within the typecast and the value passed is typically the value we want to use.
        // Typically, the getter just returns the value.
        // Modifications to the value within the getter are not written to the object.

        // Getter can transform value after typecast.
        if (properties.getter) {
            value = properties.getter.call(this[_privateKey]._root, value);
        }

        return value;
    }

    // Used to write value to object.
    function writeValue(value, fieldSchema) {
        // onBeforeValueSet allows you to cancel the operation.
        // It doesn't work like transform and others that allow you to modify the value because all typecast has already happened.
        // For use-cases where you need to modify the value, you can set a new value in the handler and return false.
        if (this[_privateKey]._options.onBeforeValueSet) {
            if (this[_privateKey]._options.onBeforeValueSet.call(this, value, fieldSchema.name) === false) {
                return;
            }
        }

        // Alias simply copies the value without actually writing it to alias index.
        // Because the value isn't actually set on the alias index, onValueSet isn't fired.
        if (fieldSchema.type === 'alias') {
            this[fieldSchema.index] = value;
            return;
        }

        // Write the value to the inner object.
        this[_privateKey]._obj[fieldSchema.name] = value;

        // onValueSet notifies you after a value has been written.
        if (this[_privateKey]._options.onValueSet) {
            this[_privateKey]._options.onValueSet.call(this, value, fieldSchema.name);
        }
    }

    // Represents an error encountered when trying to set a value.

    var SetterError = function SetterError(errorMessage, setValue, originalValue, fieldSchema) {
        _classCallCheck(this, SetterError);

        this.errorMessage = errorMessage;
        this.setValue = setValue;
        this.originalValue = originalValue;
        this.fieldSchema = fieldSchema;
    };

    // Returns typecasted value if possible. If rejected, originalValue is returned.


    function typecast(value, originalValue, properties) {
        var options = this[_privateKey]._options;

        // Allow transform to manipulate raw properties.
        if (properties.transform) {
            value = properties.transform.call(this[_privateKey]._root, value, originalValue, properties);
        }

        // Allow null to be preserved.
        if (value === null && options.preserveNull) {
            return null;
        }

        // Property types are always normalized as lowercase strings despite shorthand definitions being available.
        switch (properties.type) {
            case 'string':
                // Reject if object or array.
                if (_.isObject(value) || _.isArray(value)) {
                    throw new SetterError('String type cannot typecast Object or Array types.', value, originalValue, properties);
                }

                // If index is being set with null or undefined, set value and end.
                if (value === undefined || value === null) {
                    return undefined;
                }

                // Typecast to String.
                value = value + '';

                // If stringTransform function is defined, use.
                // This is used before we do validation checks (except to be sure we have a string at all).
                if (properties.stringTransform) {
                    value = properties.stringTransform.call(this[_privateKey]._root, value, originalValue, properties);
                }

                // If clip property & maxLength properties are set, the string should be clipped.
                // This is basically a shortcut property that could be done with stringTransform.
                if (properties.clip !== undefined && properties.maxLength !== undefined) {
                    value = value.substr(0, properties.maxLength);
                }

                // If enum is being used, be sure the value is within definition.
                if (_.isArray(properties.enum) && properties.enum.indexOf(value) === -1) {
                    throw new SetterError('String does not exist in enum list.', value, originalValue, properties);
                }

                // If minLength is defined, check to be sure the string is > minLength.
                if (properties.minLength !== undefined && value.length < properties.minLength) {
                    throw new SetterError('String length too short to meet minLength requirement.', value, originalValue, properties);
                }

                // If maxLength is defined, check to be sure the string is < maxLength.
                if (properties.maxLength !== undefined && value.length > properties.maxLength) {
                    throw new SetterError('String length too long to meet maxLength requirement.', value, originalValue, properties);
                }

                // If regex is defined, check to be sure the string matches the regex pattern.
                if (properties.regex && !properties.regex.test(value)) {
                    throw new SetterError('String does not match regular expression pattern.', value, originalValue, properties);
                }

                return value;

            case 'number':
                // If index is being set with null, undefined, or empty string: clear value.
                if (value === undefined || value === null || value === '') {
                    return undefined;
                }

                // Set values for boolean.
                if (_.isBoolean(value)) {
                    value = value ? 1 : 0;
                }

                // Remove comma from strings.
                if (typeof value === 'string') {
                    value = value.replace(/,/g, '');
                }

                // Reject if array, object, or not numeric.
                if (_.isArray(value) || _.isObject(value) || !isNumeric(value)) {
                    throw new SetterError('Number type cannot typecast Array or Object types.', value, originalValue, properties);
                }

                // Typecast to number.
                value = value * 1;

                // Transformation after typecasting but before validation and filters.
                if (properties.numberTransform) {
                    value = properties.numberTransform.call(this[_privateKey]._root, value, originalValue, properties);
                }

                if (properties.min !== undefined && value < properties.min) {
                    throw new SetterError('Number is too small to meet min requirement.', value, originalValue, properties);
                }

                if (properties.max !== undefined && value > properties.max) {
                    throw new SetterError('Number is too big to meet max requirement.', value, originalValue, properties);
                }

                return value;

            case 'boolean':
                // If index is being set with null, undefined, or empty string: clear value.
                if (value === undefined || value === null || value === '') {
                    return undefined;
                }

                // If is String and is 'false', convert to Boolean.
                if (value === 'false') {
                    return false;
                }

                // If is Number, <0 is true and >0 is false.
                if (isNumeric(value)) {
                    return value * 1 > 0 ? true : false;
                }

                // Use Javascript to eval and return boolean.
                value = value ? true : false;

                // Transformation after typecasting but before validation and filters.
                if (properties.booleanTransform) {
                    value = properties.booleanTransform.call(this[_privateKey]._root, value, originalValue, properties);
                }

                return value;

            case 'array':
                // If it's an object, typecast to an array and return array.
                if (_.isObject(value)) {
                    value = _.toArray(value);
                }

                // Reject if not array.
                if (!_.isArray(value)) {
                    throw new SetterError('Array type cannot typecast non-Array types.', value, originalValue, properties);
                }

                // Arrays are never set directly.
                // Instead, the values are copied over to the existing SchemaArray instance.
                // The SchemaArray is initialized immediately and will always exist.
                originalValue.length = 0;
                _.each(value, function (arrayValue) {
                    originalValue.push(arrayValue);
                });

                return originalValue;

            case 'object':
                // If it's not an Object, reject.
                if (!_.isObject(value)) {
                    throw new SetterError('Object type cannot typecast non-Object types.', value, originalValue, properties);
                }

                // If object is schema object and an entirely new object was passed, clear values and set.
                // This preserves the object instance.
                if (properties.objectType) {
                    // The object will usually exist because it's initialized immediately for deep access within SchemaObjects.
                    // However, in the case of Array elements, it will not exist.
                    var schemaObject = void 0;
                    if (originalValue !== undefined) {
                        // Clear existing values.
                        schemaObject = originalValue;
                        schemaObject.clear();
                    } else {
                        // The SchemaObject doesn't exist yet. Let's initialize a new one.
                        // This is used for Array types.
                        schemaObject = new properties.objectType({}, this[_privateKey]._root);
                    }

                    // Copy value to SchemaObject and set value to SchemaObject.
                    for (var key in value) {
                        schemaObject[key] = value[key];
                    }
                    value = schemaObject;
                }

                // Otherwise, it's OK.
                return value;

            case 'date':
                // If index is being set with null, undefined, or empty string: clear value.
                if (value === undefined || value === null || value === '') {
                    return undefined;
                }

                // Reject if object, array or boolean.
                if (!_.isDate(value) && !_.isString(value) && !_.isNumber(value)) {
                    throw new SetterError('Date type cannot typecast Array or Object types.', value, originalValue, properties);
                }

                // Attempt to parse string value with Date.parse (which returns number of milliseconds).
                if (_.isString(value)) {
                    value = Date.parse(value);
                }

                // If is timestamp, convert to Date.
                if (isNumeric(value)) {
                    value = new Date((value + '').length > 10 ? value : value * 1000);
                }

                // If the date couldn't be parsed, do not modify index.
                if (value == 'Invalid Date' || !_.isDate(value)) {
                    throw new SetterError('Could not parse date.', value, originalValue, properties);
                }

                // Transformation after typecasting but before validation and filters.
                if (properties.dateTransform) {
                    value = properties.dateTransform.call(this[_privateKey]._root, value, originalValue, properties);
                }

                return value;

            default:
                // 'any'
                return value;
        }
    }

    // Properties can be passed in multiple forms (an object, just a type, etc).
    // Normalize to a standard format.
    function normalizeProperties(properties, name) {
        // Allow for shorthand type declaration:

        // Check to see if the user passed in a raw type of a properties hash.
        if (properties) {
            // Raw type passed.
            // index: Type is translated to index: {type: Type}
            // Properties hash created.
            if (properties.type === undefined) {
                properties = {
                    type: properties
                };

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
        if (_.isObject(properties.type) && properties.type.type !== undefined) {
            _.each(properties.type, function (value, key) {
                if (properties[key] === undefined) {
                    properties[key] = value;
                }
            });
            properties.type = properties.type.type;
        }

        // Null or undefined should be flexible and allow any value.
        if (properties.type === null || properties.type === undefined) {
            properties.type = 'any';

            // Convert object representation of type to lowercase string.
            // String is converted to 'string', Number to 'number', etc.
            // Do not convert the initialized SchemaObjectInstance to a string!
            // Check for a shorthand declaration of schema by key length.
        } else if (_.isString(properties.type.name) && properties.type.name !== 'SchemaObjectInstance' && Object.keys(properties.type).length === 0) {
            properties.type = properties.type.name;
        }
        if (_.isString(properties.type)) {
            properties.type = properties.type.toLowerCase();
        }

        // index: [Type] or index: [] is translated to index: {type: Array, arrayType: Type}
        if (_.isArray(properties.type)) {
            if (_.size(properties.type)) {
                // Properties will be normalized when array is initialized.
                properties.arrayType = properties.type[0];
            }
            properties.type = 'array';
        }

        // index: {} or index: SchemaObject is translated to index: {type: Object, objectType: Type}
        if (!_.isString(properties.type)) {
            if (_.isFunction(properties.type)) {
                properties.objectType = properties.type;
                properties.type = 'object';
            } else if (_.isObject(properties.type)) {
                // When an empty object is passed, no schema is enforced.
                if (_.size(properties.type)) {
                    // Options should be inherited by sub-SchemaObjects, except toObject.
                    var options = _.clone(this[_privateKey]._options);
                    delete options.toObject;

                    // When we're creating a nested schema automatically, it should always inherit the root "this".
                    options.inheritRootThis = true;

                    // Initialize the SchemaObject sub-schema automatically.
                    properties.objectType = new SchemaObject(properties.type, options);
                }

                // Regardless of if we created a sub-schema or not, the field is indexed as an object.
                properties.type = 'object';
            }
        }

        // Set name if passed on properties.
        // It's used to show what field an error what generated on.
        if (name) {
            properties.name = name;
        }

        return properties;
    }

    // Add field to schema and initializes getter and setter for the field.
    function addToSchema(index, properties) {
        this[_privateKey]._schema[index] = normalizeProperties.call(this, properties, index);

        defineGetter.call(this[_privateKey]._getset, index, this[_privateKey]._schema[index]);
        defineSetter.call(this[_privateKey]._getset, index, this[_privateKey]._schema[index]);
    }

    // Defines getter for specific field.
    function defineGetter(index, properties) {
        var _this = this;

        // If the field type is an alias, we retrieve the value through the alias's index.
        var indexOrAliasIndex = properties.type === 'alias' ? properties.index : index;

        this.__defineGetter__(index, function () {
            // If accessing object or array, lazy initialize if not set.
            if (!_this[_privateKey]._obj[indexOrAliasIndex] && (properties.type === 'object' || properties.type === 'array')) {
                // Initialize object.
                if (properties.type === 'object') {
                    if (properties.default !== undefined) {
                        writeValue.call(_this[_privateKey]._this, _.isFunction(properties.default) ? properties.default.call(_this) : properties.default, properties);
                    } else {
                        writeValue.call(_this[_privateKey]._this, properties.objectType ? new properties.objectType({}, _this[_privateKey]._root) : {}, properties);
                    }

                    // Native arrays are not used so that Array class can be extended with custom behaviors.
                } else if (properties.type === 'array') {
                    writeValue.call(_this[_privateKey]._this, new SchemaArray(_this, properties), properties);
                }
            }

            try {
                return getter.call(_this, _this[_privateKey]._obj[indexOrAliasIndex], properties);
            } catch (error) {
                // This typically happens when the default value isn't valid -- log error.
                _this[_privateKey]._errors.push(error);
            }
        });
    }

    // Defines setter for specific field.
    function defineSetter(index, properties) {
        var _this2 = this;

        this.__defineSetter__(index, function (value) {
            // Don't proceed if readOnly is true.
            if (properties.readOnly) {
                return;
            }

            try {
                // this[_privateKey]._this[index] is used instead of this[_privateKey]._obj[index] to route through the public interface.
                writeValue.call(_this2[_privateKey]._this, typecast.call(_this2, value, _this2[_privateKey]._this[index], properties), properties);
            } catch (error) {
                // Setter failed to validate value -- log error.
                _this2[_privateKey]._errors.push(error);
            }
        });
    }

    // Reset field to default value.
    function clearField(index, properties) {
        // Aliased fields reflect values on other fields and do not need to be cleared.
        if (properties.isAlias === true) {
            return;
        }

        // In case of object & array, they must be initialized immediately.
        if (properties.type === 'object') {
            this[properties.name].clear();

            // Native arrays are never used so that toArray can be globally supported.
            // Additionally, other properties such as unique rely on passing through SchemaObject.
        } else if (properties.type === 'array') {
            this[properties.name].length = 0;

            // Other field types can simply have their value set to undefined.
        } else {
            writeValue.call(this[_privateKey]._this, undefined, properties);
        }
    }

    // Represents a basic array with typecasted values.

    var SchemaArray = function (_extendableBuiltin2) {
        _inherits(SchemaArray, _extendableBuiltin2);

        function SchemaArray(self, properties) {
            _classCallCheck(this, SchemaArray);

            // Store all internals.
            var _this3 = _possibleConstructorReturn(this, (SchemaArray.__proto__ || Object.getPrototypeOf(SchemaArray)).call(this));

            var _private = _this3[_privateKey] = {};

            // Store reference to self.
            _private._self = self;

            // Store properties (arrayType, unique, etc).
            _private._properties = properties;

            // Normalize our own properties.
            if (properties.arrayType) {
                properties.arrayType = normalizeProperties.call(self, properties.arrayType);
            }
            return _this3;
        }

        _createClass(SchemaArray, [{
            key: 'push',
            value: function push() {
                var _this4 = this;

                // Values are passed through the typecast before being allowed onto the array if arrayType is set.
                // In the case of rejection, the typecast returns undefined, which is not appended to the array.
                var values = void 0;

                for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                    args[_key] = arguments[_key];
                }

                if (this[_privateKey]._properties.arrayType) {
                    values = [].map.call(args, function (value) {
                        return typecast.call(_this4[_privateKey]._self, value, undefined, _this4[_privateKey]._properties.arrayType);
                    }, this);
                } else {
                    values = args;
                }

                // Enforce filter.
                if (this[_privateKey]._properties.filter) {
                    values = _.filter(values, function (value) {
                        return _this4[_privateKey]._properties.filter.call(_this4, value);
                    });
                }

                // Enforce uniqueness.
                if (this[_privateKey]._properties.unique) {
                    values = _.difference(values, _.toArray(this));
                }

                return Array.prototype.push.apply(this, values);
            }
        }, {
            key: 'concat',
            value: function concat() {
                // Return new instance of SchemaArray.
                var schemaArray = new SchemaArray(this[_privateKey]._self, this[_privateKey]._properties);

                // Create primitive array with all elements.
                var array = this.toArray();

                for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                    args[_key2] = arguments[_key2];
                }

                for (var i in args) {
                    if (args[i].toArray) {
                        args[i] = args[i].toArray();
                    }
                    array = array.concat(args[i]);
                }

                // Push each value in individually to typecast.
                for (var _i in array) {
                    schemaArray.push(array[_i]);
                }

                return schemaArray;
            }
        }, {
            key: 'toArray',
            value: function toArray() {
                // Create new Array to hold elements.
                var array = [];

                // Loop through each element, clone if necessary.
                _.each(this, function (element) {
                    // Call toObject() method if defined (this allows us to return primitive objects instead of SchemaObjects).
                    if (_.isObject(element) && _.isFunction(element.toObject)) {
                        element = element.toObject();

                        // If is non-SchemaType object, shallow clone so that properties modification don't have an affect on the original object.
                    } else if (_.isObject(element)) {
                        element = _.clone(element);
                    }

                    array.push(element);
                });

                return array;
            }
        }, {
            key: 'toJSON',
            value: function toJSON() {
                return this.toArray();
            }

            // Used to detect instance of SchemaArray internally.

        }, {
            key: '_isSchemaArray',
            value: function _isSchemaArray() {
                return true;
            }
        }]);

        return SchemaArray;
    }(_extendableBuiltin(Array));

    // Represents an object FACTORY with typed indexes.


    var SchemaObject = function SchemaObject(schema) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        _classCallCheck(this, SchemaObject);

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
            setUndefined: false,

            // If this is set to true, null will NOT be converted to undefined automatically.
            // In many cases, when people use null, they actually want to unset a value.
            // There are rare cases where preserving the null is important.
            // Set to true if you are one of those rare cases.
            preserveNull: false,

            // Allow "profileURL" to be set with "profileUrl" when set to false
            keysIgnoreCase: false,

            // Inherit root object "this" context from parent SchemaObject.
            inheritRootThis: false
        }, options);

        // Some of the options require reflection.
        if (_isProxySupported === false) {
            if (!options.strict) {
                throw new Error('[schema-object] Turning strict mode off requires --harmony flag.');
            }
            if (options.dotNotation) {
                throw new Error('[schema-object] Dot notation support requires --harmony flag.');
            }
            if (options.keysIgnoreCase) {
                throw new Error('[schema-object] Keys ignore case support requires --harmony flag.');
            }
        }

        // Used at minimum to hold default constructor.
        if (!options.constructors) {
            options.constructors = {};
        }

        // Default constructor can be overridden.
        if (!options.constructors.default) {
            // By default, populate runtime values as provided to this instance of object.
            options.constructors.default = function (values) {
                this.populate(values);
            };
        }

        // Create SchemaObject factory.
        var SO = SchemaObjectInstanceFactory(schema, options);

        // Add custom constructors.
        _.each(options.constructors, function (method, key) {
            SO[key] = function () {
                // Initialize new SO.
                var obj = new SO();

                // Expose default constructor to populate defaults.
                obj[_privateKey]._reservedFields.super = function () {
                    options.constructors.default.apply(obj, arguments);
                };

                // Call custom constructor.
                method.apply(obj, arguments);;

                // Cleanup and return SO.
                delete obj[_privateKey]._reservedFields.super;
                return obj;
            };
        });

        return SO;
    };

    // Represents an object INSTANCE factory with typed indexes.


    function SchemaObjectInstanceFactory(schema, options) {
        // Represents an actual instance of an object.
        var SchemaObjectInstance = function () {
            _createClass(SchemaObjectInstance, null, [{
                key: 'extend',

                // Extend instance factory.
                value: function extend(extendSchema) {
                    var extendOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

                    // Extend requires reflection.
                    if (_isProxySupported === false) {
                        throw new Error('[schema-object] Extending object requires --harmony flag.');
                    }

                    // Merge schema and options together.
                    var mergedSchema = _.merge({}, schema, extendSchema);
                    var mergedOptions = _.merge({}, options, extendOptions);

                    // Allow method and constructor to call `this.super()`.
                    var methodHomes = ['methods', 'constructors'];
                    var _iteratorNormalCompletion = true;
                    var _didIteratorError = false;
                    var _iteratorError = undefined;

                    try {
                        var _loop = function _loop() {
                            var methodHome = _step.value;

                            // Ensure object containing methods exists on both provided and original options.
                            if (_.size(options[methodHome]) && _.size(extendOptions[methodHome])) {
                                // Loop through each method in the original options.
                                // It's not necessary to bind `this.super()` for options that didn't already exist.
                                _.each(options[methodHome], function (method, name) {
                                    // The original option may exist, but was it extended?
                                    if (extendOptions[methodHome][name]) {
                                        // Extend method by creating a binding that takes the `this` context given and adds `self`.
                                        // `self` is a reference to the original method, also bound to the correct `this`.
                                        mergedOptions[methodHome][name] = function () {
                                            var _this5 = this,
                                                _arguments = arguments;

                                            this[_privateKey]._reservedFields.super = function () {
                                                return method.apply(_this5, _arguments);
                                            };
                                            var ret = extendOptions[methodHome][name].apply(this, arguments);
                                            delete this[_privateKey]._reservedFields.super;
                                            return ret;
                                        };
                                    }
                                });
                            }
                        };

                        for (var _iterator = methodHomes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                            _loop();
                        }
                    } catch (err) {
                        _didIteratorError = true;
                        _iteratorError = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion && _iterator.return) {
                                _iterator.return();
                            }
                        } finally {
                            if (_didIteratorError) {
                                throw _iteratorError;
                            }
                        }
                    }

                    return new SchemaObject(mergedSchema, mergedOptions);
                }

                // Construct new instance pre-populated with values.

            }]);

            function SchemaObjectInstance(values, _root) {
                var _this6 = this;

                _classCallCheck(this, SchemaObjectInstance);

                // Object used to store internals.
                var _private = this[_privateKey] = {};

                //
                _private._root = options.inheritRootThis ? _root || this : this;

                // Object with getters and setters bound.
                _private._getset = this;

                // Public version of ourselves.
                // Overwritten with proxy if available.
                _private._this = this;

                // Object used to store raw values.
                var obj = _private._obj = {};

                // Schema as defined by constructor.
                _private._schema = schema;

                // Errors, retrieved with getErrors().
                _private._errors = [];

                // Options need to be accessible. Shared across ALL INSTANCES.
                _private._options = options;

                // Reserved keys for storing internal properties accessible from outside.
                _private._reservedFields = {};

                // Normalize schema properties to allow for shorthand declarations.
                _.each(schema, function (properties, index) {
                    schema[index] = normalizeProperties.call(_this6, properties, index);
                });

                // Define getters/typecasts based off of schema.
                _.each(schema, function (properties, index) {
                    // Use getter / typecast to intercept and re-route, transform, etc.
                    defineGetter.call(_private._getset, index, properties);
                    defineSetter.call(_private._getset, index, properties);
                });

                // Proxy used as interface to object allows to intercept all access.
                // Without Proxy we must register individual getter/typecasts to put any logic in place.
                // With Proxy, we still use the individual getter/typecasts, but also catch values that aren't in the schema.
                if (_isProxySupported === true) {
                    (function () {
                        var proxy = _this6[_privateKey]._this = new Proxy(_this6, {
                            // Ensure only public keys are shown.
                            ownKeys: function ownKeys(target) {
                                return Object.keys(_this6.toObject());
                            },

                            // Return keys to iterate.
                            enumerate: function enumerate(target) {
                                return Object.keys(_this6[_privateKey]._this)[Symbol.iterator]();
                            },

                            // Check to see if key exists.
                            has: function has(target, key) {
                                return !!_private._getset[key];
                            },

                            // Ensure correct prototype is returned.
                            getPrototypeOf: function getPrototypeOf() {
                                return _private._getset;
                            },

                            // Ensure readOnly fields are not writeable.
                            getOwnPropertyDescriptor: function getOwnPropertyDescriptor(target, key) {
                                return {
                                    value: proxy[key],
                                    writeable: !schema[key] || schema[key].readOnly !== true,
                                    enumerable: true,
                                    configurable: true
                                };
                            },

                            // Intercept all get calls.
                            get: function get(target, name, receiver) {
                                // First check to see if it's a reserved field.
                                if (_reservedFields.includes(name)) {
                                    return _this6[_privateKey]._reservedFields[name];
                                }

                                // Support dot notation via lodash.
                                if (options.dotNotation && name.indexOf('.') !== -1) {
                                    return _.get(_this6[_privateKey]._this, name);
                                }

                                // Use registered getter without hitting the proxy to avoid creating an infinite loop.
                                return _this6[name];
                            },

                            // Intercept all set calls.
                            set: function set(target, name, value, receiver) {
                                // Support dot notation via lodash.
                                if (options.dotNotation && name.indexOf('.') !== -1) {
                                    return _.set(_this6[_privateKey]._this, name, value);
                                }

                                // Find real keyname if case sensitivity is off.
                                if (options.keysIgnoreCase && !schema[name]) {
                                    name = getIndex.call(_this6, name);
                                }

                                if (!schema[name]) {
                                    if (options.strict) {
                                        // Strict mode means we don't want to deal with anything not in the schema.
                                        // TODO: SetterError here.
                                        return true;
                                    } else {
                                        // Add index to schema dynamically when value is set.
                                        // This is necessary for toObject to see the field.
                                        addToSchema.call(_this6, name, {
                                            type: 'any'
                                        });
                                    }
                                }

                                // This hits the registered setter but bypasses the proxy to avoid an infinite loop.
                                _this6[name] = value;

                                // Necessary for Node v6.0. Prevents error: 'set' on proxy: trap returned falsish for property 'string'".
                                return true;
                            },

                            // Intercept all delete calls.
                            deleteProperty: function deleteProperty(target, property) {
                                _this6[property] = undefined;
                                return true;
                            }
                        });
                    })();
                }

                // Populate schema defaults into object.
                _.each(schema, function (properties, index) {
                    if (properties.default !== undefined) {
                        // Temporarily ensure readOnly is turned off to prevent the set from failing.
                        var readOnly = properties.readOnly;
                        properties.readOnly = false;
                        _this6[index] = _.isFunction(properties.default) ? properties.default.call(_this6) : properties.default;
                        properties.readOnly = readOnly;
                    }
                });

                // Call default constructor.
                _private._options.constructors.default.call(this, values);

                // May return actual object instance or Proxy, depending on harmony support.
                return _private._this;
            }

            // Populate values.


            _createClass(SchemaObjectInstance, [{
                key: 'populate',
                value: function populate(values) {
                    for (var key in values) {
                        this[_privateKey]._this[key] = values[key];
                    }
                }

                // Clone and return SchemaObject.

            }, {
                key: 'clone',
                value: function clone() {
                    return new SchemaObjectInstance(this.toObject(), this[_privateKey]._root);
                }

                // Return object without getter/typecasts, extra properties, etc.

            }, {
                key: 'toObject',
                value: function toObject() {
                    var _this7 = this;

                    var options = this[_privateKey]._options;
                    var getObj = {};

                    // Populate all properties in schema.
                    _.each(this[_privateKey]._schema, function (properties, index) {
                        // Do not write values to object that are marked as invisible.
                        if (properties.invisible) {
                            return;
                        }

                        // Fetch value through the public interface.
                        var value = _this7[_privateKey]._this[index];

                        // Do not write undefined values to the object because of strange behavior when using with MongoDB.
                        // MongoDB will convert undefined to null and overwrite existing values in that field.
                        if (value === undefined && options.setUndefined !== true) {
                            return;
                        }

                        // Clone objects so they can't be modified by reference.
                        if (_.isObject(value)) {
                            if (value._isSchemaObject) {
                                value = value.toObject();
                            } else if (value._isSchemaArray) {
                                value = value.toArray();
                            } else if (_.isArray(value)) {
                                value = value.splice(0);
                            } else if (_.isDate(value)) {
                                // https://github.com/documentcloud/underscore/pull/863
                                // _.clone doesn't work on Date object.
                                getObj[index] = new Date(value.getTime());
                            } else {
                                value = _.clone(value);
                            }

                            // Don't write empty objects or arrays.
                            if (!_.isDate(value) && !options.setUndefined && !_.size(value)) {
                                return;
                            }
                        }

                        // Write to object.
                        getObj[index] = value;
                    });

                    // If options contains toObject, pass through before returning final object.
                    if (_.isFunction(options.toObject)) {
                        getObj = options.toObject.call(this, getObj);
                    }

                    return getObj;
                }

                // toJSON is an interface used by JSON.stringify.
                // Return the raw object if called.

            }, {
                key: 'toJSON',
                value: function toJSON() {
                    return this.toObject();
                }

                // Clear all values.

            }, {
                key: 'clear',
                value: function clear() {
                    var _this8 = this;

                    _.each(this[_privateKey]._schema, function (properties, index) {
                        clearField.call(_this8[_privateKey]._this, index, properties);
                    });
                }

                // Get all errors.

            }, {
                key: 'getErrors',
                value: function getErrors() {
                    var _this9 = this;

                    var errors = [];
                    var _iteratorNormalCompletion2 = true;
                    var _didIteratorError2 = false;
                    var _iteratorError2 = undefined;

                    try {
                        for (var _iterator2 = this[_privateKey]._errors[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                            var error = _step2.value;

                            error = _.cloneDeep(error);
                            error.schemaObject = this;
                            errors.push(error);
                        }
                    } catch (err) {
                        _didIteratorError2 = true;
                        _iteratorError2 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion2 && _iterator2.return) {
                                _iterator2.return();
                            }
                        } finally {
                            if (_didIteratorError2) {
                                throw _iteratorError2;
                            }
                        }
                    }

                    _.each(this[_privateKey]._schema, function (properties, index) {
                        if (properties.required && _this9[index] === undefined) {
                            var error = new SetterError(index + ' is required but not provided', _this9[index], _this9[index], properties);
                            error.schemaObject = _this9;
                            errors.push(error);
                        }
                    });

                    // Look for sub-SchemaObjects.
                    for (var name in this[_privateKey]._schema) {
                        var field = this[_privateKey]._schema[name];
                        if (field.type === 'object' && typeof field.objectType === 'function') {
                            var subErrors = this[name].getErrors();
                            var _iteratorNormalCompletion3 = true;
                            var _didIteratorError3 = false;
                            var _iteratorError3 = undefined;

                            try {
                                for (var _iterator3 = subErrors[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                                    var subError = _step3.value;

                                    subError.fieldSchema.name = name + '.' + subError.fieldSchema.name;
                                    subError.schemaObject = this;
                                    errors.push(subError);
                                }
                            } catch (err) {
                                _didIteratorError3 = true;
                                _iteratorError3 = err;
                            } finally {
                                try {
                                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                                        _iterator3.return();
                                    }
                                } finally {
                                    if (_didIteratorError3) {
                                        throw _iteratorError3;
                                    }
                                }
                            }
                        }
                    }

                    return errors;
                }

                // Clear all errors

            }, {
                key: 'clearErrors',
                value: function clearErrors() {
                    this[_privateKey]._errors.length = 0;

                    // Look for sub-SchemaObjects.
                    for (var name in this[_privateKey]._schema) {
                        var field = this[_privateKey]._schema[name];
                        if (field.type === 'object' && typeof field.objectType === 'function') {
                            this[name].clearErrors();
                        }
                    }
                }

                // Has errors?

            }, {
                key: 'isErrors',
                value: function isErrors() {
                    return this.getErrors().length > 0;
                }

                // Used to detect instance of schema object internally.

            }, {
                key: '_isSchemaObject',
                value: function _isSchemaObject() {
                    return true;
                }
            }]);

            return SchemaObjectInstance;
        }();

        // Add custom methods to factory-generated class.


        _.each(options.methods, function (method, key) {
            if (SchemaObjectInstance.prototype[key]) {
                throw new Error('Cannot overwrite existing ' + key + ' method with custom method.');
            }
            SchemaObjectInstance.prototype[key] = method;
        });

        return SchemaObjectInstance;
    }

    if ((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object') {
        module.exports = SchemaObject;
    } else if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object') {
        window.SchemaObject = SchemaObject;
    } else {
        throw new Error('[schema-object] Error: module.exports and window are unavailable.');
    }
})();