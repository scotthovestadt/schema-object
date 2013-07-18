node-schema-object [![Build Status](https://travis-ci.org/scotthovestadt/node-schema-object.png?branch=master)](https://travis-ci.org/scotthovestadt/node-schema-object)
==================

Designed to enforce schema on Javascript objects. Allows you to specify type, transformation and validation of values via a set of attributes. Support for sub-schemas included.

```
npm install node-schema-object
```

#Very basic usage example
```
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
```
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

#Types

Supported types:
- String
- Number
- Boolean
- Date
- Array (including types within Array)
- Object (including typed SchemaObjects for sub-schemas)
- 'alias'
- undefined

When a type is specified, it will be enforced. Typecasting is enforced on all types. If a value cannot be typecasted to the correct type, the original value will remain untouched.

Types can be extended with a variety of attributes. Some attributes are type-specific and some apply to all types.

Custom types can be created by defining an object with type properties.
```
var NotEmptyString = {type: String, minLength: 1};
country: {type: NotEmptyString, default: 'USA'}
```

##General attributes

###transform
Called immediately when value is set and before any typecast is done.
```
name: {type: String, transform: function(value) {
  // Modify the value here...
  return value;
}}
```

###default
Provide default value. You may pass value directly or pass a function which will be executed when the value is retrieved. The function is executed in the context of the object and can use "this" to access other properties.
```
country: {type: String, default: 'USA'}
```

###readOnly
If true, the value can be read but cannot be written to. This can be useful for creating fields that reflect other values.
```
fullName: {type: String, readOnly: true, default: function(value) {
  return (this.firstName + ' ' + this.lastName).trim();
}}
```

###invisible
If true, the value can be written to but isn't outputted as an index when toObject() is called. This can be useful for creating aliases that redirect to other indexes but aren't actually present on the object.
```
zip: String,
postalCode: {type: 'alias', invisible: true, index: 'zip'}
// this.postalCode = 12345 -> this.toObject() -> {zip: '12345'}
```


##String

###stringTransform
Called after value is typecast to string **if** value was successfully typecast but called before all validation.
```
postalCode: {type: String, stringTransform: function(string) {
  // Type will ALWAYS be String, so using string prototype is OK.
  return string.toUpperCase();
}}
```

###regex
Validates string against Regular Expression. If string doesn't match, it's rejected.
```
memberCode: {type: String, regex: new RegExp('^([0-9A-Z]{4})$')}
```

###enum
Validates string against array of strings. If not present, it's rejected.
```
gender: {type: String, enum: ['m', 'f']}
```

###minLength
Enforces minimum string length.
```
notEmpty: {type: String, minLength: 1}
```

###maxLength
Enforces maximum string length.
```
stateAbbrev: {type: String, maxLength: 2}
```

###clip
If true, clips string to maximum string length instead of rejecting string.
```
bio: {type: String, maxLength: 255, clip: true}
```


##Number

###min
Number must be > min attribute or it's rejected.
```
positive: {type: Number, min: 0}
```

###max
Number must be < max attribute or it's rejected.
```
negative: {type: Number, max: 0}
```


##Array

###unique
Ensures duplicate-free array, using === to test object equality.
```
emails: {type: Array, unique: true, arrayType: String}
```

###arrayType
Elements within the array will be typed to the attributes defined.
```
aliases: {type: Array, arrayType: {type: String, minLength: 1}}
```

An alternative shorthand version is also available -- wrap the properties within array brackets.
```
aliases: [{type: String, minLength: 1}]
```


##Object
###objectType
Allows you to define a typed object.
```
company: {type: Object, objectType: {
  name: String
}}
```

An alternative shorthand version is also available -- simply pass an instance of SchemaObject or a schema.
```
company: {
  name: String
}
```


##Alias

###index (required)
The index key of the property being aliased.
```
zip: String,
postalCode: {type: 'alias', alias: 'zip'}
// this.postalCode = 12345 -> this.toObject() -> {zip: '12345'}
```

#Unit tests
```
  any type
    transform
      ✓ should turn any string to lowercase but not touch other values 
    default
      ◦ default as function + readOnly to combine properties into single readOnl      ✓ default as function + readOnly to combine properties into single readOnly property 
    alias
      ✓ should allow alias to be used to set values 
      ✓ should allow alias to pre-transform values 
    readOnly
      ✓ should not allow you to modify value 

  String
    typecasting
      ✓ should typecast integer to string 
      ✓ should typecast boolean to string 
      ✓ should join array into string 
      ✓ should reject object 
    regex
      ✓ should only allow values that match regex ^([A-Z]{4})$ 
    enum
      ✓ should allow values in enum 
      ✓ value should remain untouched when non-enum is passed 
      ✓ default must be in enum or is rejected 
      ✓ default should be set when in enum 
    stringTransform
      ✓ should return lowercase 
      ◦ should always be passed a String object and not called if undefined or n      ✓ should always be passed a String object and not called if undefined or null 
    read only
      ✓ should always be default value 
    minLength
      ✓ should not allow empty strings 
    maxLength
      ✓ should allow a max of 5 characters 
    maxLength + clip
      ✓ should clip string to 5 characters 

  Number
    typecasting
      ✓ should typecast string to number 
      ✓ should typecast boolean to number 
    min
      ✓ should reject values below min 
    max
      ✓ should reject values above max 

  Boolean
    typecasting
      ✓ should typecast string to boolean 
      ✓ should typecast number to boolean 

  Object
    accessing properties
      ✓ should set properties without initializing object 
    schema
      ✓ should allow nested schemas 
      ✓ should allow shorthand declaration 

  Array
    typecasting
      ✓ should typecast all array elements to string 
      ✓ should transform all strings to lowercase 
      ✓ should allow you to push() in new schema objects 
      ✓ should enforce types on existing array elements 
    unique
      ✓ should enforce unique values within array with typecasting 
      ✓ should enforce unique values within array without typecasting 
    toArray
      ✓ should return native Array 

  Date
    typecasting
      ✓ should typecast string "June 21, 1988" to date 
      ✓ should typecast string "06/21/1988" to date 
      ✓ should typecast string "6/21/1988" to date 
      ✓ should reject nonsense strings 
      ✓ should typecast integer timestamp seconds to date 
      ✓ should typecast integer timestamp milliseconds to date 
      ✓ should reject boolean 
      ✓ should reject array 
      ✓ should reject object 

  toObject()
    ✓ should have index "string" with value "1234" 
    ✓ should write Date object for Date type 
    ✓ should converted nested SchemaObjects to primitive Object 
    ✓ should converted SchemaObjects nested within Arrays to primitive Objects 
    ✓ should not write invisible indexes 

  type definition
    ✓ should allow custom type using an object with properties in "type" property and merge properties together 
```
