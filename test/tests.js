var should = require('should'),
    _ = require('underscore'),
    SchemaObject = require('../lib/schemaobject');

describe('SchemaObject construction options', function() {
  it('strict: true should not allow you to set any index', function() {
    var SO = new SchemaObject({
    }, {
      strict: true
    });

    var o = new SO();
    o.unknownIndex = 'a string';
    should.not.exist(o.unknownIndex);
  });

  it('strict: false should allow you to set any index (but behave normally for schema-fields)', function() {
    var SO = new SchemaObject({
      aNumber: Number
    }, {
      strict: false
    });

    var o = new SO();
    o.unknownIndex = 'a string';
    o.unknownIndex.should.be.a.String;
    o.unknownIndex.should.equal('a string');
  });

  it('dotNotation: true should allow you to set and get deep value with dot notation ("data.stuff" = data: {stuff: value}', function() {
    var SO = new SchemaObject({
      profile: {
        name: String
      }
    }, {
      dotNotation: true
    });

    var o = new SO();
    o['profile.name'] = 'Scott';
    o.profile.name.should.be.a.String;
    o.profile.name.should.equal('Scott');
    o['profile.name'].should.be.a.String;
    o['profile.name'].should.equal('Scott');
  });
});

describe('any type', function() {
  describe('transform', function() {
    var SO = new SchemaObject({
      value: {
        type: null,
        transform: function(value) {
          if(_.isString(value)) {
            return value.toLowerCase();
          }
          return value;
        }
      }
    });

    it('should turn any string to lowercase but not touch other values', function() {
      var o = new SO();

      o.value = 123;
      o.value.should.be.a.Number;
      o.value.should.equal(123);

      o.value = 'HELLO';
      o.value.should.be.a.String;
      o.value.should.equal('hello');
    });
  });

  describe('default', function() {
    it('default as function + readOnly to combine properties into single readOnly property', function() {
      var SO = new SchemaObject({
        firstName: String,
        lastName: String,
        name: {type: String, readOnly: true, default: function() {
          var name = (this.firstName ? this.firstName + ' ' : '') + (this.lastName ? this.lastName : '');
          return name ? name : undefined;
        }}
      });

      var o = new SO();
      o.firstName = 'Scott';
      o.lastName = 'Hovestadt';
      o.name.should.be.a.String;
      o.name.should.equal('Scott Hovestadt');
    });
  });

  describe('alias', function() {
    var SO = new SchemaObject({
      state: String,
      region: {type: 'alias', index: 'state'},
      regionTransform: {type: 'alias', index: 'state', transform: function(value) {
        if(value === 'test') {
          value = value.toUpperCase();
        }
        return value;
      }}
    });

    it('should allow alias to be used to set values', function() {
      var o = new SO();
      o.region = 'CA';
      o.region.should.be.a.String;
      o.region.should.equal('CA');
      o.state.should.be.a.String;
      o.state.should.equal('CA');
    });

    it('should allow alias to pre-transform values', function() {
      var o = new SO();
      o.regionTransform = 'test';
      o.regionTransform.should.be.a.String;
      o.regionTransform.should.equal('TEST');
      o.state.should.be.a.String;
      o.state.should.equal('TEST');
    });

    it('should typecast values set through alias', function() {
      var o = new SO();
      o.region = 123;
      o.state.should.be.a.String;
      o.state.should.equal('123');
    });
  });

  describe('readOnly', function() {
    it('should not allow you to modify value', function() {
      var SO = new SchemaObject({
        firstName: String,
        lastName: String,
        name: {type: String, readOnly: true, default: function() {
          var name = (this.firstName ? this.firstName + ' ' : '') + (this.lastName ? this.lastName : '');
          return name ? name : undefined;
        }}
      });

      var o = new SO();
      o.firstName = 'Scott';
      o.lastName = 'Hovestadt';
      o.name = 'John Smith';
      o.name.should.equal('Scott Hovestadt');
    });
  });
});

describe('String', function() {
  describe('typecasting', function() {
    var SO = new SchemaObject({
      string: String
    });

    it('should typecast integer to string', function() {
      var o = new SO();

      o.string = 123;
      o.string.should.be.a.String;
      o.string.should.equal('123');
    });

    it('should typecast boolean to string', function() {
      var o = new SO();

      o.string = true;
      o.string.should.be.a.String;
      o.string.should.equal('true');

      o.string = false;
      o.string.should.be.a.String;
      o.string.should.equal('false');
    });

    it('should join array into string', function() {
      var o = new SO();

      o.string = ['h', 'e', 'l', 'l', 'o'];
      should.not.exist(o.string);
    });

    it('should reject object', function() {
      var o = new SO();

      o.string = {0: 'h', 1: 'e', 2: 'l', 3: 'l', 4: 'o'};
      should.not.exist(o.string);
      o.getErrors().length.should.equal(1);
    });
  });

  describe('regex', function() {
    var SO = new SchemaObject({
      string: {
        type: String,
        regex: new RegExp('^([A-Z]{4})$')
      }
    });

    it('should only allow values that match regex ^([A-Z]{4})$', function() {
      var o = new SO();

      o.string = 'ABCD';
      o.string.should.equal('ABCD');

      o.string = '1234';
      o.string.should.equal('ABCD');
    });
  });

  describe('enum', function() {
    var SO = new SchemaObject({
      string: {type: String, enum: ['allowed', 'also allowed'], default: 'allowed'}
    });

    it('should allow values in enum', function() {
      var o = new SO();

      o.string = 'allowed';
      o.string.should.equal('allowed');

      o.string = 'also allowed';
      o.string.should.equal('also allowed');
    });

    it('value should remain untouched when non-enum is passed', function() {
      var o = new SO();

      o.string = 'also allowed';
      o.string.should.equal('also allowed');

      o.string = 'xxxxxx';
      o.string.should.equal('also allowed');
    });

    it('default must be in enum or is rejected', function() {
      var SO = new SchemaObject({
        string: {type: String, enum: ['allowed', 'also allowed'], default: 'not in enum'}
      });
      var o = new SO();

      should.not.exist(o.string);
      o.getErrors().length.should.equal(1);
    });

    it('default should be set when in enum', function() {
      var o = new SO();

      o.string.should.equal('allowed');
    });
  });

  describe('stringTransform', function() {
    var SO = new SchemaObject({
      string: {
        type: String,
        stringTransform: function(string) {
          return string.toUpperCase();
        }
      }
    });

    it('should return lowercase', function() {
      var o = new SO();

      o.string = 'hello';
      o.string.should.equal('HELLO');
    });

    it('should always be passed a String object and not called if undefined or null', function() {
      var o = new SO();

      o.string = 123;
      o.string.should.equal('123');

      o.string = false;
      o.string.should.equal('FALSE');

      o.string = undefined;
      should.not.exist(o.string);

      o.string = null;
      should.not.exist(o.string);
    });
  });

  describe('read only', function() {
    var SO = new SchemaObject({
      string: {type: String, readOnly: true, default: 'permanent value'}
    });

    it('should always be default value', function() {
      var o = new SO();
      o.string.should.equal('permanent value');
      o.string = 'hello';
      o.string.should.equal('permanent value');
    });
  });
  
  describe('minLength', function() {
    var SO = new SchemaObject({
      notEmptyString: {type: String, minLength: 1}
    });

    it('should not allow empty strings', function() {
      var o = new SO();
      o.notEmptyString = '';
      should.not.exist(o.notEmptyString);
      o.notEmptyString = '1';
      o.notEmptyString.should.equal('1');
    });
  });

  describe('maxLength', function() {
    var SO = new SchemaObject({
      shortString: {type: String, maxLength: 5}
    });

    it('should allow a max of 5 characters', function() {
      var o = new SO();
      o.shortString = '123456';
      should.not.exist(o.shortString);
      o.shortString = '1';
      o.shortString.should.equal('1');
    });
  });

  describe('maxLength + clip', function() {
    var SO = new SchemaObject({
      clippedString: {type: String, maxLength: 5, clip: true}
    });

    it('should clip string to 5 characters', function() {
      var o = new SO();
      o.clippedString = '123456';
      o.clippedString.should.equal('12345');
    });
  });
});

describe('Number', function() {
  var SO = new SchemaObject({
    number: Number,
    minMax: {type: Number, min: 100, max: 200}
  });

  describe('typecasting', function() {
    it('should typecast string to number', function() {
      var o = new SO();

      o.number = '123';
      o.number.should.be.a.Number;
      o.number.should.equal(123);

      o.number = o.number + 1;
      o.number.should.equal(124);
    });

    it('should typecast boolean to number', function() {
      var o = new SO();

      o.number = false;
      o.number.should.be.a.Number;
      o.number.should.equal(0);

      o.number = true;
      o.number.should.be.a.Number;
      o.number.should.equal(1);
    });
  });

  describe('min', function() {
    it('should reject values below min', function() {
      var o = new SO();

      o.minMax = 0;
      should.not.exist(o.minMax);
      o.getErrors().length.should.equal(1);

      o.minMax = 100;
      o.minMax.should.equal(100);

      o.minMax = 150;
      o.minMax.should.equal(150);
    });
  });

  describe('max', function() {
    it('should reject values above max', function() {
      var o = new SO();

      o.minMax = 300;
      should.not.exist(o.minMax);
      o.getErrors().length.should.equal(1);

      o.minMax = 200;
      o.minMax.should.equal(200);
    });
  });

  describe('numberTransform', function() {
    var SO = new SchemaObject({
      number: {
        type: Number,
        numberTransform: function(number) {
          return Math.round(number);
        }
      }
    });

    it('should always round number', function() {
      var o = new SO();

      o.number = 13.2;
      o.number.should.equal(13);
    });

    it('should always be passed a Number object and not called if undefined or null', function() {
      var o = new SO();

      o.number = 'not a number';
      should.not.exist(o.date);

      o.number = undefined;
      should.not.exist(o.date);

      o.number = null;
      should.not.exist(o.date);
    });
  });
});

describe('Boolean', function() {
  describe('typecasting', function() {
    var SO = new SchemaObject({
      boolean: Boolean
    });

    it('should typecast string to boolean', function() {
      var o = new SO();

      o.boolean = '123';
      o.boolean.should.be.a.Boolean;
      o.boolean.should.equal(true);

      o.boolean = 'true';
      o.boolean.should.be.a.Boolean;
      o.boolean.should.equal(true);

      o.boolean = '1';
      o.boolean.should.be.a.Boolean;
      o.boolean.should.equal(true);

      o.boolean = '';
      o.boolean.should.be.a.Boolean;
      o.boolean.should.equal(false);

      o.boolean = 'false';
      o.boolean.should.be.a.Boolean;
      o.boolean.should.equal(false);

      o.boolean = '0';
      o.boolean.should.be.a.Boolean;
      o.boolean.should.equal(false);

      o.boolean = '-1';
      o.boolean.should.be.a.Boolean;
      o.boolean.should.equal(false);
    });

    it('should typecast number to boolean', function() {
      var o = new SO();

      o.boolean = 1;
      o.boolean.should.be.a.Boolean;
      o.boolean.should.equal(true);

      o.boolean = 100;
      o.boolean.should.be.a.Boolean;
      o.boolean.should.equal(true);

      o.boolean = 0;
      o.boolean.should.be.a.Boolean;
      o.boolean.should.equal(false);

      o.boolean = -1;
      o.boolean.should.be.a.Boolean;
      o.boolean.should.equal(false);
    });
  });

  describe('booleanTransform', function() {
    var SO = new SchemaObject({
      boolean: {
        type: Boolean,
        booleanTransform: function(boolean) {
          return !boolean;
        }
      }
    });

    it('should always reverse boolean', function() {
      var o = new SO();

      o.boolean = true;
      o.boolean.should.equal(false);
    });
  });
});

describe('Object', function() {
  describe('accessing properties', function() {
    var SO = new SchemaObject({
      anObject: {}
    });

    it('should set properties without initializing object', function() {
      var o = new SO();

      o.anObject.prop = 123;
      should.exist(o.anObject.prop);
      o.anObject.prop.should.equal(123);
    });
  });

  describe('schema', function() {
    var Profile = new SchemaObject({
      firstName: String,
      age: Number,
      notEmptyString: {type: String, minLength: 1}
    });
    var SO = new SchemaObject({
      profile: Profile,
      shorthandProfile: {
        firstName: String,
        age: Number,
        notEmptyString: {type: String, minLength: 1}
      }
    });

    it('should allow nested schemas', function() {
      var o = new SO();

      o.profile.firstName = 123;
      o.profile.firstName.should.be.a.String;
      o.profile.firstName.should.equal('123');

      o.profile.age = '23';
      o.profile.age.should.be.a.Number;
      o.profile.age.should.equal(23);

      o.profile.notEmptyString = '';
      should.not.exist(o.profile.notEmptyString);
    });

    it('should allow default values', function() {
      var ModelWithDefaults = new SchemaObject({
        profile: {
          type: Profile,
          default: function() {
            return new Profile({ firstName: "Jane" });
          }
        }
      });

      var m = new ModelWithDefaults();

      m.profile.firstName.should.equal("Jane");
    });

    it('should allow shorthand declaration', function() {
      var o = new SO();

      o.shorthandProfile.firstName = 123;
      o.shorthandProfile.firstName.should.be.a.String;
      o.shorthandProfile.firstName.should.equal('123');

      o.shorthandProfile.age = '23';
      o.shorthandProfile.age.should.be.a.Number;
      o.shorthandProfile.age.should.equal(23);

      o.shorthandProfile.notEmptyString = '';
      should.not.exist(o.shorthandProfile.notEmptyString);
    });
  });
});

describe('Array', function() {
  describe('typecasting', function() {
    var SO = new SchemaObject({
      strings: [String],
      transformedStrings: [{
        type: String,
        stringTransform: function(string) {
          return string.toLowerCase();
        }
      }],
      profiles: [{
        firstName: String
      }]
    });

    it('should typecast all array elements to string', function() {
      var o = new SO();

      o.strings.push(123);
      o.strings.should.have.lengthOf(1);
      o.strings[0].should.be.a.String;
      o.strings[0].should.equal('123');
    });

    it('should typecast Array when set to instance of existing array', function() {
      var o = new SO();
      o.strings = [123, 321];

      o.strings.should.be.an.instanceof(Array);
      o.strings[0].should.be.a.String;
      o.strings[0].should.equal('123');
      o.strings[1].should.be.a.String;
      o.strings[1].should.equal('321');
    });

    it('should transform all strings to lowercase', function() {
      var o = new SO();

      o.transformedStrings.push('HELLO');
      o.transformedStrings.should.have.lengthOf(1);
      o.transformedStrings[0].should.be.a.String;
      o.transformedStrings[0].should.equal('hello');
    });

    it('should allow you to push() in new schema objects', function() {
      var o = new SO();

      o.profiles.push({
        firstName: 4321
      });
      o.profiles.should.have.lengthOf(1);
      o.profiles[0].firstName.should.be.a.String;
      o.profiles[0].firstName.should.equal('4321');
    });

    it('should enforce types on existing array elements', function() {
      var o = new SO();

      o.profiles.push({
        firstName: 4321
      });
      o.profiles.should.have.lengthOf(1);
      o.profiles[0].firstName.should.be.a.String;
      o.profiles[0].firstName.should.equal('4321');

      o.profiles[0].firstName = 1234;
      o.profiles[0].firstName.should.be.a.String;
      o.profiles[0].firstName.should.equal('1234');
    });
  });

  describe('unique', function() {
    var SO = new SchemaObject({
      uniqueStrings: {type: Array, unique: true, arrayType: String},
      unique: {type: Array, unique: true}
    });

    it('should enforce unique values within array with typecasting', function() {
      var o = new SO();

      o.uniqueStrings.push(1234);
      o.uniqueStrings.should.have.lengthOf(1);
      o.uniqueStrings.push('1234');
      o.uniqueStrings.should.have.lengthOf(1);
      o.uniqueStrings.push('12345');
      o.uniqueStrings.should.have.lengthOf(2);
    });

    it('should enforce unique values within array without typecasting', function() {
      var o = new SO();

      o.unique.push('scott');
      o.unique.should.have.lengthOf(1);
      o.unique.push('scott');
      o.unique.should.have.lengthOf(1);
      o.unique.push('Scott');
      o.unique.should.have.lengthOf(2);
    });
  });

  describe('toArray', function() {
    var SO = new SchemaObject({
      strings: {type: Array, unique: true, arrayType: String}
    });

    it('should return native Array', function() {
      var o = new SO();

      o.strings.push(1234);
      var array = o.strings.toArray();
      array.should.be.an.instanceOf(Array);
      array.should.not.have.property('toArray');
      array[0].should.be.equal('1234');
    });
  });
});

describe('Date', function() {
  describe('typecasting', function() {
    var SO = new SchemaObject({
      date: Date
    });

    it('should accept Date type', function() {
      var o = new SO();

      var now = new Date();
      o.date = now;
      o.date.should.be.an.instanceof(Date);
      o.date.getMonth().should.equal(now.getMonth());
      o.date.getDate().should.equal(now.getDate());
      o.date.getFullYear().should.equal(now.getFullYear());
    });

    it('should typecast string "June 21, 1988" to date', function() {
      var o = new SO();

      o.date = 'June 21, 1988';
      o.date.should.be.an.instanceof(Date);
      o.date.getMonth().should.equal(5);
      o.date.getDate().should.equal(21);
      o.date.getFullYear().should.equal(1988);
    });

    it('should typecast string "06/21/1988" to date', function() {
      var o = new SO();

      o.date = '06/21/1988';
      o.date.should.be.an.instanceof(Date);
      o.date.getMonth().should.equal(5);
      o.date.getDate().should.equal(21);
      o.date.getFullYear().should.equal(1988);
    });

    it('should typecast string "6/21/1988" to date', function() {
      var o = new SO();

      o.date = '6/21/1988';
      o.date.should.be.an.instanceof(Date);
      o.date.getMonth().should.equal(5);
      o.date.getDate().should.equal(21);
      o.date.getFullYear().should.equal(1988);
    });

    it('should reject nonsense strings', function() {
      var o = new SO();

      o.date = 'not a date';
      should.not.exist(o.date);
      o.getErrors().length.should.equal(1);
    });

    it('should typecast integer timestamp seconds to date', function() {
      var o = new SO();

      o.date = 582879600;
      o.date.should.be.an.instanceof(Date);
      o.date.getTime().should.equal(582879600000);
      o.date.getMonth().should.equal(5);
      o.date.getDate().should.equal(21);
      o.date.getFullYear().should.equal(1988);
    });

    it('should typecast integer timestamp milliseconds to date', function() {
      var o = new SO();

      o.date = 582879600000;
      o.date.should.be.an.instanceof(Date);
      o.date.getTime().should.equal(582879600000);
      o.date.getMonth().should.equal(5);
      o.date.getDate().should.equal(21);
      o.date.getFullYear().should.equal(1988);
    });

    it('should reject boolean', function() {
      var o = new SO();

      o.date = true;
      should.not.exist(o.date);
      o.getErrors().length.should.equal(1);

      o.date = false;
      should.not.exist(o.date);
      o.getErrors().length.should.equal(2);
    });

    it('should reject array', function() {
      var o = new SO();

      o.date = ['h', 'e', 'l', 'l', 'o'];
      should.not.exist(o.date);
      o.getErrors().length.should.equal(1);
    });

    it('should reject object', function() {
      var o = new SO();

      o.date = {0: 'h', 1: 'e', 2: 'l', 3: 'l', 4: 'o'};
      should.not.exist(o.date);
      o.getErrors().length.should.equal(1);
    });

    // https://github.com/scotthovestadt/node-schema-object/issues/5
    it('should correctly parse dates before 1970', function() {
      var o = new SO();

      o.date = '03/02/1959';
      o.date.getMonth().should.equal(2);
      o.date.getDate().should.equal(2);
      o.date.getFullYear().should.equal(1959);
    });
  });

  describe('dateTransform', function() {
    var SO = new SchemaObject({
      date: {
        type: Date,
        dateTransform: function(date) {
          date.setFullYear(2000);
          return date;
        }
      }
    });

    it('should always return date with year 2000 but other properties untouched', function() {
      var o = new SO();

      var date = new Date();
      o.date = date;
      o.date.getFullYear().should.equal(2000);
      o.date.getMonth().should.equal(date.getMonth());
      o.date.getDay().should.equal(date.getDay());

      o.date = date.toISOString();
      o.date.getFullYear().should.equal(2000);
      o.date.getMonth().should.equal(date.getMonth());
      o.date.getDay().should.equal(date.getDay());
    });

    it('should always be passed a Date object and not called if undefined or null', function() {
      var o = new SO();

      o.date = 'not a date';
      should.not.exist(o.date);

      o.date = false;
      should.not.exist(o.date);

      o.date = undefined;
      should.not.exist(o.date);

      o.date = null;
      should.not.exist(o.date);
    });
  });
});

describe('toObject()', function() {
  var SO = new SchemaObject({
    string: String,
    date: Date,
    invisible: {type: String, invisible: true},
    schemaObject: {
      string: String
    },
    schemaObjects: [{
      string: String
    }],
    arrayOfStrings: [String]
  });

  it('should have index "string" with value "1234"', function() {
    var o = new SO();

    o.string = 1234;
    var obj = o.toObject();
    obj.string.should.be.a.String;
    obj.string.should.equal('1234');
  });

  it('should write Date object for Date type', function() {
    var o = new SO();

    o.date = 582879600000;
    var obj = o.toObject();
    obj.date.should.be.an.instanceof(Date);
    obj.date.getTime().should.equal(582879600000);
    obj.date.getMonth().should.equal(5);
    obj.date.getDate().should.equal(21);
    obj.date.getFullYear().should.equal(1988);
  });

  it('should write Arrays for Array type', function() {
    var o = new SO();
    o.arrayOfStrings = ['hello', 'world'];

    var obj = o.toObject();
    obj.arrayOfStrings.should.be.an.instanceof(Array);
    obj.arrayOfStrings[0].should.equal('hello');
    obj.arrayOfStrings[1].should.equal('world');
  });

  it('should converted nested SchemaObjects to primitive Object', function() {
    var o = new SO();

    o.schemaObject.string = 1234;
    var obj = o.toObject();
    obj.schemaObject.string.should.be.a.String;
    obj.schemaObject.string.should.equal('1234');
    obj.schemaObject.should.be.an.Object;
    obj.schemaObject.should.should.not.have.property('toObject');
  });

  it('should converted SchemaObjects nested within Arrays to primitive Objects', function() {
    var o = new SO();

    o.schemaObjects.push({string: 1234});
    var obj = o.toObject();
    obj.schemaObjects[0].string.should.be.a.String;
    obj.schemaObjects[0].string.should.equal('1234');
    obj.schemaObjects[0].should.be.an.Object;
    obj.schemaObjects[0].should.not.have.property('toObject');
  });

  it('should not write invisible indexes', function() {
    var o = new SO();

    o.invisible = 'hello';
    o.invisible.should.be.a.String;
    o.invisible.should.equal('hello');
    var obj = o.toObject();
    should.not.exist(obj.invisible);
  });

  it('should be called for serializing an object to JSON', function() {
    var o = new SO();
    o.string = 'hello';
    o.date = new Date();
    o.schemaObject.string = 'test';
    o.schemaObjects.push({string: 1234});

    var obj = JSON.stringify(o.toObject());
    var jsonObject = JSON.stringify(o);
    obj.should.equal(jsonObject);
  });

  it('should write non-schema indexes when strict mode is off', function() {
    var SO = new SchemaObject({
    }, {
      strict: false
    });

    var o = new SO();
    o.randomIndex = 123;
    var obj = o.toObject();
    obj.randomIndex.should.equal(123);
  });
});

describe('clearErrors()', function() {
  it('should remove all errors on an object', function() {
    var SO = new SchemaObject({
      string: {type: String, minLength: 15}
    });

    var o = new SO();
    o.string = '1234';
    o.getErrors().length.should.equal(1);
    o.clearErrors();
    o.getErrors().length.should.equal(0);
  });
});

describe('type definition', function() {
  it('should allow custom type using an object with properties in "type" property and merge properties together', function() {
    var MyString = {type: String, minLength: 5, maxLength: 10};
    var SO = new SchemaObject({
      customString: {type: MyString, maxLength: 15}
    });

    var o = new SO();
    o.customString = '1234';
    should.not.exist(o.customString);
    o.customString = '12345';
    o.customString.should.equal('12345');

    o.customString = '12345678901';
    o.customString.should.equal('12345678901');

    o.customString = '12345678901234567890';
    o.customString.should.equal('12345678901');
  });
});