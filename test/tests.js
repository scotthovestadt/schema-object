var should = require('should'),
    _ = require('underscore'),
    SchemaObject = require('../lib/schemaobject');

describe('String', function() {
  describe('typecasting', function() {
    var SO = new SchemaObject({
      string: String
    });

    it('should typecast integer to string', function() {
      var o = new SO();

      o.string = 123;
      o.string.should.be.a('string');
      o.string.should.equal('123');
    });

    it('should typecast boolean to string', function() {
      var o = new SO();

      o.string = true;
      o.string.should.be.a('string');
      o.string.should.equal('true');

      o.string = false;
      o.string.should.be.a('string');
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
      o.number.should.be.a('number');
      o.number.should.equal(123);

      o.number = o.number + 1;
      o.number.should.equal(124);
    });

    it('should typecast boolean to number', function() {
      var o = new SO();

      o.number = false;
      o.number.should.be.a('number');
      o.number.should.equal(0);

      o.number = true;
      o.number.should.be.a('number');
      o.number.should.equal(1);
    });
  });

  describe('min', function() {
    it('should reject values below min', function() {
      var o = new SO();

      o.minMax = 0;
      should.not.exist(o.minMax);

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

      o.minMax = 200;
      o.minMax.should.equal(200);
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
      o.boolean.should.be.a('boolean');
      o.boolean.should.equal(true);

      o.boolean = 'true';
      o.boolean.should.be.a('boolean');
      o.boolean.should.equal(true);

      o.boolean = '1';
      o.boolean.should.be.a('boolean');
      o.boolean.should.equal(true);

      o.boolean = '';
      o.boolean.should.be.a('boolean');
      o.boolean.should.equal(false);

      o.boolean = 'false';
      o.boolean.should.be.a('boolean');
      o.boolean.should.equal(false);

      o.boolean = '0';
      o.boolean.should.be.a('boolean');
      o.boolean.should.equal(false);

      o.boolean = '-1';
      o.boolean.should.be.a('boolean');
      o.boolean.should.equal(false);
    });

    it('should typecast number to boolean', function() {
      var o = new SO();

      o.boolean = 1;
      o.boolean.should.be.a('boolean');
      o.boolean.should.equal(true);

      o.boolean = 100;
      o.boolean.should.be.a('boolean');
      o.boolean.should.equal(true);

      o.boolean = 0;
      o.boolean.should.be.a('boolean');
      o.boolean.should.equal(false);

      o.boolean = -1;
      o.boolean.should.be.a('boolean');
      o.boolean.should.equal(false);
    });
  });
});

describe('Object', function() {
  describe('accessing properties', function() {
    var SO = new SchemaObject({
      objects: {}
    });

    it('should set properties without initializing object', function() {
      var o = new SO();

      o.prop = 123;
      should.exist(o.prop);
      o.prop.should.equal(123);
    });
  });

  describe('schema', function() {
    var Profile = new SchemaObject({
      firstName: String,
      age: Number,
      notEmptyString: {type: String, minLength: 1}
    });
    var SO = new SchemaObject({
      profile: Profile
    });

    it('should allow nested schemas', function() {
      var o = new SO();

      o.profile.firstName = 123;
      o.profile.firstName.should.be.a('string');
      o.profile.firstName.should.equal('123');

      o.profile.age = '23';
      o.profile.age.should.be.a('number');
      o.profile.age.should.equal(23);

      o.profile.notEmptyString = '';
      should.not.exist(o.profile.notEmptyString);
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
      o.strings[0].should.be.a('string');
      o.strings[0].should.equal('123');
    });

    it('should transform all strings to lowercase', function() {
      var o = new SO();

      o.transformedStrings.push('HELLO');
      o.transformedStrings.should.have.lengthOf(1);
      o.transformedStrings[0].should.be.a('string');
      o.transformedStrings[0].should.equal('hello');
    });
  });
});

describe('Date', function() {
  describe('typecasting', function() {
    var SO = new SchemaObject({
      date: Date
    });

    it('should typecast string "June 21, 1989" to date', function() {
      var o = new SO();

      o.date = 'June 21, 1988';
      o.date.should.be.an.instanceof(Date);
      o.date.getMonth().should.equal(5);
      o.date.getDate().should.equal(21);
      o.date.getFullYear().should.equal(1988);
    });

    it('should reject nonsense strings', function() {
      var o = new SO();

      o.date = 'not a date';
      should.not.exist(o.date);
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

      o.date = false;
      should.not.exist(o.date);
    });

    it('should reject array', function() {
      var o = new SO();

      o.date = ['h', 'e', 'l', 'l', 'o'];
      should.not.exist(o.date);
    });

    it('should reject object', function() {
      var o = new SO();

      o.date = {0: 'h', 1: 'e', 2: 'l', 3: 'l', 4: 'o'};
      should.not.exist(o.date);
    });
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
      o.value.should.be.a('number');
      o.value.should.equal(123);

      o.value = 'HELLO';
      o.value.should.be.a('string');
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
      o.name.should.be.a('string');
      o.name.should.equal('Scott Hovestadt');
    });
  });
});

describe('converting schemaobject to plain object', function() {
  var SO = new SchemaObject({
    string: String
  });

  it('should have index string with value "hello"', function() {
    var o = new SO();

    o.string = 'hello';
    var obj = o.toObject();
    obj.string.should.be.a('string');
    obj.string.should.equal('hello');
  });
});