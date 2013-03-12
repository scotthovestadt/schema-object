node-schema-object
==================

Documentation of behavior can be found in unit tests.

```
  String
    typecasting
      ✓ should typecast integer to string 
      ✓ should typecast boolean to string 
      ✓ should join array into string 
      ✓ should join object into string 
    regex
      ✓ should only allow values that match regex ^([A-Z]{4})$ 
    enum
      ✓ should allow values in enum 
      ✓ value should remain untouched when non-enum is passed 
      ✓ default must be in enum or is rejected 
      ✓ default should be set when in enum 
    stringTransform
      ✓ should return lowercase 
      ✓ should always be passed a String object and not called if undefined or null read only
      ✓ should always be default valueminLength
      ✓ should not allow empty strings 

  Number
    typecasting
      ✓ should typecast string to number 
      ✓ should typecast boolean to number 

  Boolean
    typecasting
      ✓ should typecast string to boolean 
      ✓ should typecast number to boolean 

  Object
    accessing properties
      ✓ should set properties without initializing object 
    schema
      ✓ should enforce schema 

  Array
    typecasting
      ✓ should typecast all array elements to string 
      ✓ should transform all strings to lowercase 

  any type
    transform
      ✓ should turn any string to lowercase but not touch other values 

  converting schemaobject to plain object
    ✓ should have index string with value "hello"
```
