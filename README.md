node-schema-object [![Build Status](https://travis-ci.org/scotthovestadt/node-schema-object.png?branch=master)](https://travis-ci.org/scotthovestadt/node-schema-object)
==================

Designed to enforce schema on Javascript objects. Allows you to specify type, transformation and validation of values via a set of attributes. Support for sub-schemas included.

```
npm install node-schema-object
```

**For all features, run node with --harmony flag.**

#Very basic usage example
```js
var SchemaObject = require('node-schema-object');

// Create User schema
var User = new SchemaObject({
  firstName: String,
  lastName: String,
  birthDate: Date
});

// Initialize instance of user
var user = new User({firstName: 'Scott', lastName: 'Hovestadt', birthDate: 'June 21, 1988'});
console.log(user.toObject());

// Prints:
{ firstName: 'Scott',
  lastName: 'Hovestadt',
  birthDate: Tue Jun 21 1988 00:00:00 GMT-0700 (PDT) }
```

#Advanced example
```js
var SchemaObject = require('node-schema-object');

// Create custom basic type
// Type can be extended with more properties when defined
var NotEmptyString = {type: String, minLength: 1};

// Create sub-schema for user's Company
var Company = new SchemaObject({
  startDate: Date,
  endDate: Date,
  name: NotEmptyString
});

// Create User schema
var User = new SchemaObject({
  // Basic user information using custom type
  firstName: NotEmptyString,
  lastName: NotEmptyString,
  
  // "NotEmptyString" with only possible values as 'm' or 'f'
  gender: {type: NotEmptyString, enum: ['m', 'f']},
  
  // Index with sub-schema
  company: Company,
  
  // An array of Objects with an enforced type
  workHistory: [Company],
  
  // Create field which reflects other values but can't be directly modified
  fullName: {type: String, readOnly: true, default: function() {
    return (this.firstName + ' ' + this.lastName).trim();
  }}
});

// Initialize a new instance of the User with a value
var user = new User({firstName: 'Scott', lastName: 'Hovestadt', gender: 'm'});

// Set company name
user.company.name = 'My Company';

// The date is automatically typecast from String
user.company.startDate = 'June 1, 2010';

// Add company to work history
user.workHistory.push({
  name: 'Old Company',
  startDate: '01/12/2005',
  endDate: '01/20/2010'
});

console.log(user.toObject());

// Prints:
{ firstName: 'Scott',
  lastName: 'Hovestadt',
  gender: 'm',
  company: 
   { startDate: Tue Jun 01 2010 00:00:00 GMT-0700 (PDT),
     endDate: undefined,
     name: 'My Company' },
  workHistory: 
   [ { startDate: Wed Jan 12 2005 00:00:00 GMT-0800 (PST),
       endDate: Wed Jan 20 2010 00:00:00 GMT-0800 (PST),
       name: 'Old Company' } ],
  fullName: 'Scott Hovestadt' }
```

#Options

When you create the SchemaObject, you may pass a set of options as a second argument. These options allow you to fine-tune the behavior of your objects for specific needs.


## Strict

Strict mode (default: true) allows you to specify what happens when an index is set on your SchemaObject that does not exist in the schema. If strict mode is on, the index will be ignored. If strict mode is off, the index will automatically be created in the schema when it's set with type "any".

With strict mode on (default):
```js
var Profile = new SchemaObject({
  id: String
}, {
  strict: true
});

var profile = new Profile();
profile.id = "abc123";
profile.customField = "hello";

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
profile.id = "abc123";
profile.customField = "hello";

// Prints:
{ id: 'abc123', customField: 'hello' }
```

#Types

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

##General attributes

###transform
Called immediately when value is set and before any typecast is done.
```js
name: {type: String, transform: function(value) {
  // Modify the value here...
  return value;
}}
```

###default
Provide default value. You may pass value directly or pass a function which will be executed when the value is retrieved. The function is executed in the context of the object and can use "this" to access other properties.
```js
country: {type: String, default: 'USA'}
```

###readOnly
If true, the value can be read but cannot be written to. This can be useful for creating fields that reflect other values.
```js
fullName: {type: String, readOnly: true, default: function(value) {
  return (this.firstName + ' ' + this.lastName).trim();
}}
```

###invisible
If true, the value can be written to but isn't outputted as an index when toObject() is called. This can be useful for creating aliases that redirect to other indexes but aren't actually present on the object.
```js
zip: String,
postalCode: {type: 'alias', invisible: true, index: 'zip'}
// this.postalCode = 12345 -> this.toObject() -> {zip: '12345'}
```


##String

###stringTransform
Called after value is typecast to string **if** value was successfully typecast but called before all validation.
```js
postalCode: {type: String, stringTransform: function(string) {
  // Type will ALWAYS be String, so using string prototype is OK.
  return string.toUpperCase();
}}
```

###regex
Validates string against Regular Expression. If string doesn't match, it's rejected.
```js
memberCode: {type: String, regex: new RegExp('^([0-9A-Z]{4})$')}
```

###enum
Validates string against array of strings. If not present, it's rejected.
```js
gender: {type: String, enum: ['m', 'f']}
```

###minLength
Enforces minimum string length.
```js
notEmpty: {type: String, minLength: 1}
```

###maxLength
Enforces maximum string length.
```js
stateAbbrev: {type: String, maxLength: 2}
```

###clip
If true, clips string to maximum string length instead of rejecting string.
```js
bio: {type: String, maxLength: 255, clip: true}
```


##Number

###min
Number must be > min attribute or it's rejected.
```js
positive: {type: Number, min: 0}
```

###max
Number must be < max attribute or it's rejected.
```js
negative: {type: Number, max: 0}
```


##Array

###unique
Ensures duplicate-free array, using === to test object equality.
```js
emails: {type: Array, unique: true, arrayType: String}
```

###arrayType
Elements within the array will be typed to the attributes defined.
```js
aliases: {type: Array, arrayType: {type: String, minLength: 1}}
```

An alternative shorthand version is also available -- wrap the properties within array brackets.
```js
aliases: [{type: String, minLength: 1}]
```


##Object
###objectType
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


##Alias

###index (required)
The index key of the property being aliased.
```js
zip: String,
postalCode: {type: 'alias', alias: 'zip'}
// this.postalCode = 12345 -> this.toObject() -> {zip: '12345'}
```