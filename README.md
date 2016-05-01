Schema Object [![Build Status](https://travis-ci.org/scotthovestadt/schema-object.png?branch=master)](https://travis-ci.org/scotthovestadt/schema-object)
==================

Designed to enforce schema on Javascript objects. Allows you to specify type, transformation and validation of values via a set of attributes. Support for sub-schemas included.

```
npm install schema-object
```
```
bower install schema-object
```

**Node and browser environments supported. For all features, run node with the harmony proxies ````--harmony_proxies```` and harmony collections ````--harmony```` flags.**


# Very basic usage example
```js
var SchemaObject = require('schema-object');

// Create User schema
var User = new SchemaObject({
  firstName: String,
  lastName: String,
  birthDate: Date
});

// Initialize instance of user
var user = new User({firstName: 'Scott', lastName: 'Hovestadt', birthDate: 'June 21, 1988'});
console.log(user);

// Prints:
{ firstName: 'Scott',
  lastName: 'Hovestadt',
  birthDate: Tue Jun 21 1988 00:00:00 GMT-0700 (PDT) }
```

# Advanced example
```js
var SchemaObject = require('schema-object');

// Create custom basic type
// Type can be extended with more properties when defined
var NotEmptyString = {type: String, minLength: 1};

// Create sub-schema for user's Company
var Company = new SchemaObject({
  // Any string will be magically parsed into date
  startDate: Date,
  endDate: Date,
  
  // String with properties
  name: NotEmptyString,
  
  // Typed array
  tags: [NotEmptyString]
});

// Create User schema
var User = new SchemaObject({
  // Basic user information using properties
  firstName: NotEmptyString,
  lastName: NotEmptyString,
  
  // Extend "NotEmptyString" with enum property
  gender: {type: NotEmptyString, enum: ['m', 'f']},
  
  // Sub-object with enforced type
  work: Company
}, {
  // Add methods to User prototype
  methods: {
    getDisplayName: function() {
      return this.firstName + ' ' + this.lastName;
    }
  }
});

// Create Account schema by extending User schema
var Account = User.extend({
  // Add username to schema
  username: NotEmptyString,
  
  // Special behavior will transform password to hash if necessary
  // https://www.npmjs.com/package/password-hash
  password: {type: String, stringTransform: function(string) {
    if(!passwordHash.isHashed(string)) {
      string = passwordHash.generate(string);
    }
    return string;
  }}
}, {
  methods: {
    getDisplayName: function() {
      // If available, use username as display name
      // Otherwise fall back to first name and last name
      return this.username || this.super();
    }
  }
});

// Initialize a new instance of the User with a value
var account = new Account({
  username: 'scotthovestadt',
  password: 'hunter2',
  firstName: 'Scott',
  lastName: 'Hovestadt',
  gender: 'm',
  work: {
    name: 'My Company',
    startDate: 'June 1, 2010'
  }
});

console.log(account.getDisplayName());

// Prints:
"scotthovestadt"

console.log(account);

// Prints:
{ firstName: 'Scott',
  lastName: 'Hovestadt',
  gender: 'm',
  work:
   { startDate: Tue Jun 01 2010 00:00:00 GMT-0700 (PDT),
     name: 'My Company' },
  username: 'scotthovestadt' }
```

# Static Methods

## extend

Allows you to extend SchemaObject instance schema and options.

```js
var Person = new SchemaObject({
  firstName: String,
  lastName: String
}, {
  constructors: {
    fromFullName: function(fullName) {
      fullName = fullName.split(' ');
      this.firstName = fullName[0];
      this.lastName = fullName[1];
    }
  },
  methods: {
    getDisplayName: function() {
      return this.firstName + ' ' + this.lastName;
    }
  }
});

var Employee = Person.extend({
  id: Number
}, {
  methods: {
    getDisplayName: function() {
      return '[Employee ID ' + this.id + '] ' + this.super();
    }
  }
});

var john = Employee.fromFullName('John Smith');
john.id = 1;

console.log(john.getDisplayName());

// Prints:
"[Employee ID 1] John Smith"
```


# Methods

## clone

Clones SchemaObject and all sub-objects and sub-arrays into another SchemaObject container. Writes on any sub-objects or sub-arrays will not touch the original.
```js
var User = new SchemaObject({
  firstName: String,
  lastName: String
});

var user = new User({firstName: 'Scott', lastName: 'Hovestadt'});

var anotherUser = user.clone();
anotherUser.firstName = 'John';
anotherUser.lastName = 'Smith';

console.log(user);
console.log(anotherUser);


// Prints:
{ firstName: 'Scott',
  lastName: 'Hovestadt' }
{ firstName: 'John',
  lastName: 'Smith' }
```

## toObject

toObject returns a cloned primitive object, stripped of all magic. Writes on any sub-objects or sub-arrays will not touch the original. All values will be typecasted and transformed, but future writes to the primitive object will not. The [invisible attribute](https://github.com/scotthovestadt/schema-object#invisible) can be used to ensure an index stored on the SchemaObject will not be written to the primitive object. toObject is automatically called if a SchemaObject is passed to JSON.stringify.
```js
var User = new SchemaObject({
  firstName: String,
  lastName: String,
  birthDate: Date
});

var user = new User({firstName: 'Scott', lastName: 'Hovestadt', birthDate: 'June 21, 1988'});
console.log(user);

// Prints:
{ firstName: 'Scott',
  lastName: 'Hovestadt',
  birthDate: Tue Jun 21 1988 00:00:00 GMT-0700 (PDT) }
```

## populate

populate will copy an object's values.
```js
var User = new SchemaObject({
  firstName: String,
  lastName: String
});

var user = new User();
user.populate({firstName: 'Scott', lastName: 'Hovestadt'});
console.log(user);

// Prints:
{ firstName: 'Scott',
  lastName: 'Hovestadt' }
```

## clear

clear removes all values.
```js
var User = new SchemaObject({
  firstName: String,
  lastName: String
});

var user = new User({firstName: 'Scott', lastName: 'Hovestadt'});
console.log(user);

// Prints:
{ firstName: 'Scott',
  lastName: 'Hovestadt' }

user.clear();
console.log(user);

// Prints:
{ firstName: undefined,
  lastName: undefined }
```

## isErrors / getErrors / clearErrors

See documentation on [Errors](https://github.com/scotthovestadt/schema-object#errors).


# Options

When you create the SchemaObject, you may pass a set of options as a second argument. These options allow you to fine-tune the behavior of your objects for specific needs.

## constructors

The constructors option allows you to override the default or attach new constructors to your SchemaObject-created class.

```js
var Person = new SchemaObject({
  firstName: String,
  lastName: String
}, {
  constructors: {
    // Override default constructor
    default: function(values) {
      // Will call this.populate
      this.super(values);

      // Populate default values with custom constructor
      if(this.firstName === undefined) {
        this.firstName = 'John';
      }
      if(this.lastName === undefined) {
        this.lastName = 'Smith';
      }
    },

    // Create new constructor used by calling Person.fromFullName
    fromFullName: function(fullName) {
      // Will call default constructor
      this.super();

      fullName = fullName.split(' ');
      if(fullName[0]) {
        this.firstName = fullName[0];
      }
      if(fullName[1]) {
        this.lastName = fullName[1];
      }
    }
  }
});

var person = new Person({ firstName: 'Scott' });
// OR
var person = Person.fromFullName('Scott');

console.log(person);

// Prints:
{ firstName: 'Scott',
  lastName: 'Smith' }
```

## methods

The methods option allows you to attach new methods to your SchemaObject-created class.

```js
var Person = new SchemaObject({
  firstName: String,
  lastName: String
}, {
  methods: {
    getFullName: function() {
      return this.firstName + ' ' + this.lastName;
    }
  }
});

var person = new Person({ firstName: 'Scott', lastName: 'Hovestadt' });
console.log(person.getFullName());

// Prints:
{ 'Scott Hovestadt' }
```

## toObject(object)

toObject allows you to transform the model before the result of toObject() is passed back.

This example shows how it could be used to ensure transform all strings to uppercase.
```js
var Model = new SchemaObject({
  string: String
}, {
  toObject: function(object) {
    _.each(object, function(value, key) {
      if(_.isString(value)) {
        object[key] = value.toUpperCase();
      }
    });
    return object;
  }
});

var model = new Model();
model.string = 'a string';
console.log(model.string);

// Prints:
{ 'a string' }

var simpleObject = model.toObject();
console.log(simpleObject.string);

// Prints:
{ 'A STRING' }
```

## setUndefined

setUndefined (default: false) allows you to specify if an unset value is written when toObject() is called. By default, the behavior is not to write unset values. This means if there is a null/undefined primitive, an empty array, or an empty object it will not be written to the object when toObject() is called.

This value should set to true if:
- You want your database (Mongo, etc) to write unset indexes and overwrite existing fields with empty values.
- You want to write undefined values when exporting to JSON explicitly.
- You want toObject() to contain empty arrays and objects.

## strict

strict (default: true) allows you to specify what happens when an index is set on your SchemaObject that does not exist in the schema. If strict mode is on, the index will be ignored. If strict mode is off, the index will automatically be created in the schema when it's set with type "any".

With strict mode on (default):
```js
var Profile = new SchemaObject({
  id: String
}, {
  strict: true
});

var profile = new Profile();
profile.id = 'abc123';
profile.customField = 'hello';

// Prints:
{ id: 'abc123' }
```

With strict mode off:
```js
var Profile = new SchemaObject({
  id: String
}, {
  strict: false
});

var profile = new Profile();
profile.id = 'abc123';
profile.customField = 'hello';

// Prints:
{ id: 'abc123', customField: 'hello' }
```

## dotNotation

dotNotation (default: false) allows you to access deep fields in child objects using dot notation. If dot notation is on, getting or setting "profile.name" will look inside the object for a child object "profile" and then for key "name", instead of simply setting the index "profile.name" on the parent object.

The following example turns off strict mode to demonstrate the differences when toggling dot notation on or off, although dot notation can be used with or without strict mode.

With dot notation off (default):
```js
var User = new SchemaObject({
}, {
  dotNotation: false,
  strict: false
});

var user = new User();
user['profile.name'] = 'Scott';

// Prints:
{ 'profile.name': 'Scott' }
```

With dot notation on:
```js
var User = new SchemaObject({
}, {
  dotNotation: true,
  strict: false
});

var user = new User();
user['profile.name'] = 'Scott';

// Prints:
{ profile: { name: 'Scott' } }
```

## keysIgnoreCase

keysIgnoreCase (default: false) allows you to set indexes without worrying about the casing of the key.

With keys ignore case off (default):
```js
var User = new SchemaObject({
  firstName: String
}, {
  keyIgnoreCase: false
});

var user = new User();
user.firstname = 'Scott';

// Prints:
{}
```

With keys ignore case on:
```js
var User = new SchemaObject({
  firstName: String
}, {
  keyIgnoreCase: true
});

var user = new User();
user.firstname = 'Scott';

// Prints:
{ firstName: 'Scott' }
```


## onBeforeValueSet(value, key) / onValueSet(value, key)

onBeforeValueSet / onValueSet allow you to bind an event handler to all write operations on an object. Currently, it will only notify of write operations on the object itself and will not notify you when child objects are written to. If you return false or throw an error within the onBeforeValueSet handler, the write operation will be cancelled. Throwing an error will add the error to the error stack.
```js
var User = new SchemaObject({
  name: String
}, {
  onBeforeValueSet: function(value, key) {
    if(key === 'name' && value === 'Scott') {
      return false;
    }
  }
});

var user = new User();

user.name = 'Scott';
// Prints:
{ name: undefined }

user.name = 'Scott Hovestadt';
// Prints:
{ name: 'Scott Hovestadt' }
```


# Errors

When setting a value fails, an error is generated silently. Errors can be retrieved with getErrors() and cleared with clearErrors().

```js
var Profile = new SchemaObject({
  id: {type: String, minLength: 5}
});

var profile = new Profile();
profile.id = '1234';

console.log(profile.isErrors());

// Prints:
true

console.log(profile.getErrors());

// Prints:
[ { errorMessage: 'String length too short to meet minLength requirement.',
    setValue: '1234',
    originalValue: undefined,
    fieldSchema: { name: 'id', type: 'string', minLength: 5 } } ]

// Clear all errors.
profile.clearErrors();
```


# Types

Supported types:
- String
- Number
- Boolean
- Date
- Array (including types within Array)
- Object (including typed SchemaObjects for sub-schemas)
- 'alias'
- 'any'

When a type is specified, it will be enforced. Typecasting is enforced on all types except 'any'. If a value cannot be typecasted to the correct type, the original value will remain untouched.

Types can be extended with a variety of attributes. Some attributes are type-specific and some apply to all types.

Custom types can be created by defining an object with type properties.
```js
var NotEmptyString = {type: String, minLength: 1};
country: {type: NotEmptyString, default: 'USA'}
```

## General attributes

### transform
Called immediately when value is set and before any typecast is done.
```js
name: {type: String, transform: function(value) {
  // Modify the value here...
  return value;
}}
```

### default
Provide default value. You may pass value directly or pass a function which will be executed when the object is initialized. The function is executed in the context of the object and can use "this" to access other properties (which .
```js
country: {type: String, default: 'USA'}
```

### getter
Provide function to transform value when retrieved. Executed in the context of the object and can use "this" to access properties.
```js
string: {type: String, getter: function(value) { return value.toUpperCase(); }}
```

### readOnly
If true, the value can be read but cannot be written to. This can be useful for creating fields that reflect other values.
```js
fullName: {type: String, readOnly: true, default: function(value) {
  return (this.firstName + ' ' + this.lastName).trim();
}}
```

### invisible
If true, the value can be written to but isn't outputted as an index when toObject() is called. This can be useful for creating aliases that redirect to other indexes but aren't actually present on the object.
```js
zip: String,
postalCode: {type: 'alias', invisible: true, index: 'zip'}
// this.postalCode = 12345 -> this.toObject() -> {zip: '12345'}
```


## String

### stringTransform
Called after value is typecast to string **if** value was successfully typecast but called before all validation.
```js
postalCode: {type: String, stringTransform: function(string) {
  // Type will ALWAYS be String, so using string prototype is OK.
  return string.toUpperCase();
}}
```

### regex
Validates string against Regular Expression. If string doesn't match, it's rejected.
```js
memberCode: {type: String, regex: new RegExp('^([0-9A-Z]{4})$')}
```

### enum
Validates string against array of strings. If not present, it's rejected.
```js
gender: {type: String, enum: ['m', 'f']}
```

### minLength
Enforces minimum string length.
```js
notEmpty: {type: String, minLength: 1}
```

### maxLength
Enforces maximum string length.
```js
stateAbbrev: {type: String, maxLength: 2}
```

### clip
If true, clips string to maximum string length instead of rejecting string.
```js
bio: {type: String, maxLength: 255, clip: true}
```


## Number

### min
Number must be > min attribute or it's rejected.
```js
positive: {type: Number, min: 0}
```

### max
Number must be < max attribute or it's rejected.
```js
negative: {type: Number, max: 0}
```


## Array

### arrayType
Elements within the array will be typed to the attributes defined.
```js
aliases: {type: Array, arrayType: {type: String, minLength: 1}}
```

An alternative shorthand version is also available -- wrap the properties within array brackets.
```js
aliases: [{type: String, minLength: 1}]
```

### unique
Ensures duplicate-free array, using === to test object equality.
```js
emails: {type: Array, unique: true, arrayType: String}
```

### filter
Reject any values where filter callback does not return truthy.
```js
emails: {type: Array, arrayType: Person, filter: (person) => person.gender !== 'f'}
```


## Object
### objectType
Allows you to define a typed object.
```js
company: {type: Object, objectType: {
  name: String
}}
```

An alternative shorthand version is also available -- simply pass an instance of SchemaObject or a schema.
```js
company: {
  name: String
}
```


## Alias

### index (required)
The index key of the property being aliased.
```js
zip: String,
postalCode: {type: 'alias', alias: 'zip'}
// this.postalCode = 12345 -> this.toObject() -> {zip: '12345'}
```