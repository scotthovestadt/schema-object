if (typeof require !== 'undefined') {
    var should = require('should');
    var _ = require('lodash');
    var SchemaObject = require('../dist/schemaobject');
}
var _isProxySupported = typeof Proxy !== 'undefined' &&
    Proxy.toString().indexOf('proxies not supported on this platform') === -1;

describe('SchemaObject construction options', function () {
    it('should not modify the options object passed in', function () {
        var options = {
            strict: true
        };
        var Person = new SchemaObject({
            firstName: String,
            lastName: String
        }, options);

        _.keys(options).should.eql(['strict']);
    });

    it('override default constructors', function () {
        var Person = new SchemaObject({
            firstName: String,
            lastName: String
        }, {
            constructors: {
                default: function (fullName) {
                    fullName = fullName.split(' ');
                    this.firstName = fullName[0];
                    this.lastName = fullName[1];
                }
            }
        });

        var person = new Person('Scott Hovestadt');
        person.firstName.should.equal('Scott');
        person.lastName.should.equal('Hovestadt');
    });

    it('custom constructors', function () {
        var Person = new SchemaObject({
            firstName: String,
            lastName: String
        }, {
            constructors: {
                fromFullName: function (fullName) {
                    fullName = fullName.split(' ');
                    this.firstName = fullName[0];
                    this.lastName = fullName[1];
                }
            }
        });

        var person = Person.fromFullName('Scott Hovestadt');
        person.firstName.should.equal('Scott');
        person.lastName.should.equal('Hovestadt');
    });

    it('custom methods added to factory', function () {
        var Person = new SchemaObject({
            firstName: String,
            lastName: String
        }, {
            methods: {
                getFullName: function () {
                    return this.firstName + ' ' + this.lastName;
                }
            }
        });

        var person = new Person({
            firstName: 'Scott',
            lastName: 'Hovestadt'
        });
        person.getFullName().should.equal('Scott Hovestadt');
    });

    it('preserveNull: true should allow null to be set on any field', function () {
        var SO = new SchemaObject({
            str: String,
            str2: String,
            num: Number,
            num2: Number
        }, {
            preserveNull: true
        });

        var o = new SO();
        o.str = null;
        o.num = null;
        should.equal(o.str, null);
        should.equal(o.num2, null);
        o.toObject().should.eql({
            str: null,
            num: null
        });
    });

    it('preserveNull: false should treat null as undefined', function () {
        var SO = new SchemaObject({
            str: String,
            str2: String,
            num: Number,
            num2: Number
        }, {
            preserveNull: false
        });

        var o = new SO();
        o.str = null;
        o.num = null;
        should.not.exist(o.str);
        should.not.exist(o.str2);
        should.not.exist(o.num);
        should.not.exist(o.num2);
        o.toObject().should.eql({});
    });

    if (_isProxySupported === true) {
        it('custom constructors with super', function () {
            var Person = new SchemaObject({
                firstName: String,
                lastName: String
            }, {
                constructors: {
                    withDefaults: function (values) {
                        this.super(values);
                        if (this.firstName === undefined) {
                            this.firstName = 'John';
                        }
                        if (this.lastName === undefined) {
                            this.lastName = 'Smith';
                        }
                    }
                }
            });

            var person = Person.withDefaults({
                firstName: 'Scott'
            });
            person.firstName.should.equal('Scott');
            person.lastName.should.equal('Smith');
        });

        it('keysIgnoreCase: true should normalize profileUrl to key profileURL', function () {
            var SO = new SchemaObject({
                profileURL: String
            }, {
                keysIgnoreCase: true
            });

            var o = new SO();
            o.profileUrl = 'a string';
            o.profileURL.should.equal('a string');
        });

        it('keysIgnoreCase: true behavior when same key provided twice with different casing', function () {
            var SO = new SchemaObject({
                profileURL: String,
                profileurl: String
            }, {
                keysIgnoreCase: true
            });

            var o = new SO();

            o.profileurl = 'profileurl_1';
            o.profileURL = 'profileURL_2';
            o.profileurl.should.equal('profileurl_1');
            o.profileURL.should.equal('profileURL_2');

            o.PROFILEURL = 'PROFILEURL_3';
            o.profileURL.should.equal('PROFILEURL_3');

            var obj = o.toObject();
            obj.profileurl.should.equal('profileurl_1');
            obj.profileURL.should.equal('PROFILEURL_3');
        });

        it('strict: true should not allow you to set any index', function () {
            var SO = new SchemaObject({}, {
                strict: true
            });

            var o = new SO();
            o.unknownIndex = 'a string';
            should.not.exist(o.unknownIndex);
        });

        it('strict: false should allow you to initialize with any indexes', function () {
            var SubObj = new SchemaObject({
                aNum: Number
            }, {
                strict: false
            });
            var SO = new SchemaObject({
                aNumber: Number,
                subObj: SubObj,
                subShorthand: {
                    aNum: Number
                },
                subObjs: [SubObj]
            }, {
                strict: false
            });

            var sourceObj = {
                unknownIndex: 'a string',
                aNumber: 123,
                subObj: {
                    aString: 'hello'
                },
                subShorthand: {
                    aString: 'hi'
                },
                subObjs: [{
                    aString: 'hey'
                }]
            };
            var o = new SO(sourceObj);
            o.unknownIndex.should.be.a.String;
            o.unknownIndex.should.equal('a string');
            o.aNumber.should.be.a.Number;
            o.aNumber.should.equal(123);
            o.subObj.aString.should.be.a.String;
            o.subObj.aString.should.equal('hello');
            o.subShorthand.aString.should.be.a.String;
            o.subShorthand.aString.should.equal('hi');
            o.subObjs[0].aString.should.be.a.String;
            o.subObjs[0].aString.should.equal('hey');
            o.toObject().should.eql(sourceObj);
        });

        it('strict: false should allow you to set any index (but behave normally for schema-fields)', function () {
            var SO = new SchemaObject({
                aNumber: Number
            }, {
                strict: false
            });

            var o = new SO();
            o.unknownIndex = 'a string';
            o.unknownIndex.should.be.a.String;
            o.unknownIndex.should.equal('a string');
            o.aNumber = 123;
            o.aNumber.should.be.a.Number;
            o.aNumber.should.equal(123);
        });

        it('dotNotation: true should allow you to set and get deep value with dot notation ("data.stuff" = data: {stuff: value}', function () {
            var SO = new SchemaObject({
                profile: {
                    name: String
                }
            }, {
                dotNotation: true,
                strict: false
            });

            var o = new SO();
            o['profile.name'] = 'Scott';
            o.profile.name.should.be.a.String;
            o.profile.name.should.equal('Scott');
            o['profile.name'].should.be.a.String;
            o['profile.name'].should.equal('Scott');

            o['notstrict.name'] = 'Scott';
            o.notstrict.name.should.be.a.String;
            o.notstrict.name.should.equal('Scott');
            o['notstrict.name'].should.be.a.String;
            o['notstrict.name'].should.equal('Scott');
        });

        it('onBeforeValueSet: should be notified before all write operations and cancel them with return false or exception', function () {
            var onValueSetTriggered = {};

            var SO = new SchemaObject({
                name: String
            }, {
                onBeforeValueSet: function (value, key) {
                    onValueSetTriggered.value = value;
                    onValueSetTriggered.key = key;

                    if (value === 'Hovestadt') {
                        return false;
                    }
                    if (value === 'ErrorTest') {
                        throw new Error('Test error');
                    }
                },
                strict: false
            });

            var o = new SO();

            o.name = 'Scott';
            onValueSetTriggered.value.should.equal('Scott');
            onValueSetTriggered.key.should.equal('name');
            o.name.should.equal('Scott');

            o.notstrict = 'Hovestadt';
            onValueSetTriggered.value.should.equal('Hovestadt');
            onValueSetTriggered.key.should.equal('notstrict');
            should.not.exist(o.notstrict);

            o.errortest = 'ErrorTest';
            should.not.exist(o.errortest);
            o.getErrors().length.should.equal(1);
            o.isErrors().should.equal(true);
        });

        it('onValueSet: should be notified of all write operations', function () {
            var onValueSetTriggered = {};

            var SO = new SchemaObject({
                name: String
            }, {
                onValueSet: function (value, key) {
                    onValueSetTriggered.value = value;
                    onValueSetTriggered.key = key;
                },
                strict: false
            });

            var o = new SO();

            o.name = 'Scott';
            onValueSetTriggered.value.should.equal('Scott');
            onValueSetTriggered.key.should.equal('name');
            o.name.should.equal('Scott');

            o.notstrict = 'Hovestadt';
            onValueSetTriggered.value.should.equal('Hovestadt');
            onValueSetTriggered.key.should.equal('notstrict');
            o.notstrict.should.equal('Hovestadt');
        });

        it('toObject: if toObject is present in options array should be allowed to transform toObject method response', function () {
            var SO = new SchemaObject({
                string: String
            }, {
                toObject: function (object) {
                    _.each(object, function (value, key) {
                        if (_.isString(value)) {
                            object[key] = value.toUpperCase();
                        }
                    });
                    return object;
                }
            });

            var o = new SO();
            o.string = 'a string';
            o.string.should.be.a.String;
            o.string.should.equal('a string');
            var toObj = o.toObject();
            toObj.string.should.be.a.String;
            toObj.string.should.equal('A STRING');
        });
    }
});

if (_isProxySupported === true) {
    describe('SchemaObject extend', function () {
        it('should extend methods and constructors with `this.super()`', function () {
            var Person = new SchemaObject({
                firstName: String,
                lastName: String
            }, {
                constructors: {
                    fromFullName: function (fullName) {
                        this.super({
                            id: 1
                        }); // Should call default constructor
                        fullName = fullName.split(' ');
                        this.firstName = fullName[0];
                        this.lastName = fullName[1];
                    }
                },
                methods: {
                    getDisplayName: function () {
                        return this.firstName + ' ' + this.lastName;
                    }
                }
            });

            var Employee = Person.extend({
                id: Number
            }, {
                methods: {
                    getDisplayName: function () {
                        return '[Employee ID ' + this.id + '] ' + this.super();
                    }
                }
            });

            var john = Employee.fromFullName('John Smith');
            john.firstName.should.equal('John');
            john.lastName.should.equal('Smith');
            john.id.should.equal(1);
            john.getDisplayName().should.equal('[Employee ID 1] John Smith');
        });
    });
}

describe('SchemaObject internals', function () {
    var SO = new SchemaObject({
        string: String,
        date: Date,
        subobj: {
            string: String
        },
        arr: [String]
    });

    // Some tests require harmony proxies:
    if (_isProxySupported === true) {
        it('should be empty when nothing is set', function () {
            var o = new SO();
            _.size(o).should.equal(0);
        });

        it('should not see _private when iterating with lodash', function () {
            var keysIterated = 0;
            var o = new SO({
                string: 'hello',
                date: 582879600000
            });
            _.each(o, function (value, key) {
                key.should.not.equal('_private');
                keysIterated++;
            });
            keysIterated.should.equal(2);
        });

        it('should return keys for values that have been set only', function () {
            var o = new SO({
                string: 'hello',
                date: 582879600000
            });
            _.keys(o).should.eql(['string', 'date']);
        });

        // Without Proxy, delete keyword will delete the registered setter.
        it('should support delete keyword', function () {
            var o = new SO({
                string: 'hello',
                date: 582879600000
            });
            delete o.string;
            should.not.exist(o.string);
            o.string = 1;
            o.string.should.be.a.String;
            o.string.should.equal('1');
        });

    }
});

describe('any type', function () {
    describe('transform', function () {
        var SO = new SchemaObject({
            value: {
                type: null,
                transform: function (value) {
                    if (_.isString(value)) {
                        return value.toLowerCase();
                    }
                    return value;
                }
            }
        });

        it('should turn any string to lowercase but not touch other values', function () {
            var o = new SO();

            o.value = 123;
            o.value.should.be.a.Number;
            o.value.should.equal(123);

            o.value = 'HELLO';
            o.value.should.be.a.String;
            o.value.should.equal('hello');
        });
    });

    describe('getter', function () {
        it('getter to transform property on get', function () {
            var SO = new SchemaObject({
                firstName: String,
                lastName: String,
                name: {
                    type: String,
                    getter: function (value) {
                        if (value) {
                            return value;
                        } else {
                            return (this.firstName ? this.firstName + ' ' : '') + (this.lastName ? this.lastName : '');
                        }
                    }
                }
            });

            var o = new SO();
            o.firstName = 'Scott';
            o.lastName = 'Hovestadt';
            o.name.should.be.a.String;
            o.name.should.equal('Scott Hovestadt');
            o.name = 'Scott A Hovestadt';
            o.name.should.equal('Scott A Hovestadt');
        });

        it('getter should happen after typecast', function () {
            var SO = new SchemaObject({
                date: {
                    type: Date,
                    getter: function (date) {
                        if (date) {
                            return date.getTime();
                        }
                    }
                }
            });

            var o = new SO();
            o.date = 'Tue Jun 21 1988 00:00:00 GMT-0700 (PDT)';
            o.date.should.be.a.Number;
            o.date.should.equal(582879600000);
        });
    });

    describe('default', function () {
        it('default as function should only be called once', function (done) {
            var i = 0;
            var SO = new SchemaObject({
                token: {
                    type: String,
                    readOnly: true,
                    default: function () {
                        return i++;
                    }
                },
                defaultDate: {
                    type: Date,
                    default: function () {
                        return Date.now() * Math.random();
                    }
                }
            });

            var o = new SO();

            var token = o.token;
            var stillSameToken = o.token;
            token.should.equal(stillSameToken);

            var date = o.defaultDate;
            var stillSameDate = o.defaultDate;
            date.should.equal(stillSameDate);
            done();
        });
    });

    describe('alias', function () {
        var SO = new SchemaObject({
            state: String,
            region: {
                type: 'alias',
                index: 'state'
            },
            regionTransform: {
                type: 'alias',
                index: 'state',
                transform: function (value) {
                    if (value === 'test') {
                        value = value.toUpperCase();
                    }
                    return value;
                }
            }
        });

        it('should allow alias to be used to set values', function () {
            var o = new SO();
            o.region = 'CA';
            o.region.should.be.a.String;
            o.region.should.equal('CA');
            o.state.should.be.a.String;
            o.state.should.equal('CA');
        });

        it('should see same value on alias when not set through alias', function () {
            var o = new SO();
            o.state = 'CA';
            o.region.should.be.a.String;
            o.region.should.equal('CA');
            o.state.should.be.a.String;
            o.state.should.equal('CA');
        });

        it('should allow alias to pre-transform values', function () {
            var o = new SO();
            o.regionTransform = 'test';
            o.regionTransform.should.be.a.String;
            o.regionTransform.should.equal('TEST');
            o.state.should.be.a.String;
            o.state.should.equal('TEST');
        });

        it('should typecast values set through alias', function () {
            var o = new SO();
            o.region = 123;
            o.state.should.be.a.String;
            o.state.should.equal('123');
        });
    });

    describe('readOnly', function () {
        it('should not allow you to modify value', function () {
            var SO = new SchemaObject({
                name: {
                    type: String,
                    readOnly: true,
                    default: 'Scott Hovestadt'
                }
            });

            var o = new SO();
            o.name = 'John Smith';
            o.name.should.equal('Scott Hovestadt');
        });
    });

    describe('required', function () {
        it('should reject if field is required', function () {
            var SO = new SchemaObject({
                name: {
                    type: String,
                    required: true
                }
            });

            var o = new SO();
            o.getErrors().length.should.equal(1);
            o.isErrors().should.equal(true);
        });

        it('should reject if field required function returns true', function () {
          var SO = new SchemaObject({
            name: {
              type: String,
              required: function() {
                return true;
              }
            }
          });
  
          var o = new SO();
          o.getErrors().length.should.equal(1);
          o.isErrors().should.equal(true);
        });
  
        it('should not reject if field required function returns false', function () {
          var SO = new SchemaObject({
            name: {
              type: String,
              required: function() {
                return false;
              }
            }
          });
  
          var o = new SO();
          o.getErrors().length.should.equal(0);
          o.isErrors().should.equal(false);
        });

        it('should not reject if field is required but default provided', function () {
            var SO = new SchemaObject({
                name: {
                    type: String,
                    required: true,
                    default: 'Andy Pai'
                }
            });

            var o = new SO();
            o.getErrors().length.should.equal(0);
            o.isErrors().should.equal(false);
        });

        it('should not reject if field is required and provided after initialization', function () {
            var SO = new SchemaObject({
                name: {
                    type: String,
                    required: true
                }
            });

            var o = new SO();
            o.name = 'Andy & Scott';

            o.getErrors().length.should.equal(0);
            o.isErrors().should.equal(false);
        });
        
        it('should not reject if field is required and a falsy value is provided', function () {
            var SO = new SchemaObject({
                name: {
                    type: String,
                    required: true
                }
            });

            var o = new SO();
            o.name = '';

            o.getErrors().length.should.equal(0);
            o.isErrors().should.equal(false);
        });

        it('should reject if field is required and a falsy value is provided and allowFalsyValues is false', function () {
          var SO = new SchemaObject({
            name: {
              type: String,
              required: true
            }
          }, {
            allowFalsyValues: false
          });
  
          var o = new SO();
          o.name = '';
  
          o.getErrors().length.should.equal(1);
          o.isErrors().should.equal(true);
        });

        it('should not reject if field is required and a boolean false value is provided and allowFalsyValues is false', function () {
          var SO = new SchemaObject({
            myBoolean: {
              type: Boolean,
              required: true
            }
          }, {
            allowFalsyValues: false
          });

          var o = new SO();
          o.myBoolean = false;

          o.getErrors().length.should.equal(0);
          o.isErrors().should.equal(false);
          should.exist(o.toObject().myBoolean);
          o.toObject().myBoolean.should.equal(false);
        });

        it('should reject if field is required, provided, and then removed', function () {
            var SO = new SchemaObject({
                name: {
                    type: String,
                    required: true
                }
            });

            var o = new SO();
            o.name = 'Andy & Scott';
            o.getErrors().length.should.equal(0);
            o.isErrors().should.equal(false);
            o.name = undefined; 
            o.getErrors().length.should.equal(1);
            o.isErrors().should.equal(true);
        });
    });
});

describe('String', function () {
    describe('typecasting', function () {
        var SO = new SchemaObject({
            string: String
        });

        it('should typecast integer to string', function () {
            var o = new SO();

            o.string = 123;
            o.string.should.be.a.String;
            o.string.should.equal('123');
        });

        it('should typecast boolean to string', function () {
            var o = new SO();

            o.string = true;
            o.string.should.be.a.String;
            o.string.should.equal('true');

            o.string = false;
            o.string.should.be.a.String;
            o.string.should.equal('false');
        });

        it('should join array into string', function () {
            var o = new SO();

            o.string = ['h', 'e', 'l', 'l', 'o'];
            should.not.exist(o.string);
        });

        it('should reject object', function () {
            var o = new SO();

            o.string = {
                0: 'h',
                1: 'e',
                2: 'l',
                3: 'l',
                4: 'o'
            };
            should.not.exist(o.string);
            o.getErrors().length.should.equal(1);
            o.isErrors().should.equal(true);
        });
    });

    describe('regex', function () {
        it('should only allow values that match regex ^([A-Z]{4})$', function () {
            var SO = new SchemaObject({
                string: {
                    type: String,
                    regex: new RegExp('^([A-Z]{4})$')
                }
            });

            var o = new SO();

            o.string = 'ABCD';
            o.string.should.equal('ABCD');

            o.string = '1234';
            o.string.should.equal('ABCD');
        });

        it('should handle default errors', function () {
            var SO = new SchemaObject({
                string: {
                    type: String,
                    regex: new RegExp('^([A-Z]{4})$')
                }
            });

            var o = new SO();

            o.string = 'abcd';
            should.not.exist(o.string);

            var errors = o.getErrors();
            should.exist(errors);
            errors.length.should.equal(1);
            errors[0].errorMessage.should.equal('String does not match regular expression pattern.');
            errors[0].errorCode.should.equal(1214);
            errors[0].errorType.should.equal('ValidationError');

            o.string = 'ABCD';
            o.string.should.equal('ABCD');

            o.string = '1234';
            o.string.should.equal('ABCD');
        });

        it('should handle custom errors in array format', function () {
            var SO = new SchemaObject({
                string: {
                    type: String,
                    regex: [new RegExp('^([A-Z]{4})$'), 'This can only contain capital letters A-Z, and must be 4' +
                        ' characters long']
                }
            });

            var o = new SO();

            o.string = 'abcd';
            should.not.exist(o.string);

            var errors = o.getErrors();
            should.exist(errors);
            errors.length.should.equal(1);
            errors[0].errorMessage.should.equal('This can only contain capital letters A-Z, and must be 4 characters' +
                ' long');
            errors[0].errorCode.should.equal(1214);
            errors[0].errorType.should.equal('ValidationError');

            o.string = 'ABCD';
            o.string.should.equal('ABCD');

            o.string = '1234';
            o.string.should.equal('ABCD');

            //Should have the custom error when creating a second instance
            var o2 = new SO({
                string: 'abcd'
            });
            errors = o2.getErrors();
            errors[0].errorMessage.should.equal('This can only contain capital letters A-Z, and must be 4 characters' +
                ' long');
        });

        it('should handle custom errors in object format', function () {
            var SO = new SchemaObject({
                string: {
                    type: String,
                    regex: {
                        value: new RegExp('^([A-Z]{4})$'),
                        errorMessage: 'This can only contain capital letters A-Z, and must be 4 characters long'
                    }
                }
            });

            var o = new SO();

            o.string = 'abcd';
            should.not.exist(o.string);

            var errors = o.getErrors();
            should.exist(errors);
            errors.length.should.equal(1);
            errors[0].errorMessage.should.equal('This can only contain capital letters A-Z, and must be 4 characters' +
                ' long');
            errors[0].errorCode.should.equal(1214);
            errors[0].errorType.should.equal('ValidationError');

            o.string = 'ABCD';
            o.string.should.equal('ABCD');

            o.string = '1234';
            o.string.should.equal('ABCD');
        });
    });

    describe('enum', function () {
        var SO = new SchemaObject({
            string: {
                type: String,
                enum: ['allowed', 'also allowed'],
                default: 'allowed'
            }
        });

        it('should allow values in enum', function () {
            var o = new SO();

            o.string = 'allowed';
            o.string.should.equal('allowed');

            o.string = 'also allowed';
            o.string.should.equal('also allowed');
        });

        it('value should remain untouched when non-enum is passed', function () {
            var o = new SO();

            o.string = 'also allowed';
            o.string.should.equal('also allowed');

            o.string = 'xxxxxx';
            o.string.should.equal('also allowed');
        });

        it('default must be in enum or is rejected', function () {
            var SO = new SchemaObject({
                string: {
                    type: String,
                    enum: ['allowed', 'also allowed'],
                    default: 'not in enum'
                }
            });
            var o = new SO();

            should.not.exist(o.string);
            o.getErrors().length.should.equal(1);
            o.isErrors().should.equal(true);
        });

        it('default should be set when in enum', function () {
            var o = new SO();

            o.string.should.equal('allowed');
        });

        it('should handle custom error in array format', function () {
            var SO = new SchemaObject({
                string: {
                    type: String,
                    enum: [
                        ['a', 'b'],
                        'Must be a or b'
                    ]
                }
            });
            var o = new SO({
                string: 'c'
            });

            should.not.exist(o.string);
            var errors = o.getErrors();
            errors.length.should.equal(1);
            errors[0].errorMessage.should.equal('Must be a or b');
            errors[0].errorCode.should.equal(1211);

            o.isErrors().should.equal(true);

            //Should have the custom error when creating a second instance
            var o2 = new SO({
                string: 'c'
            });
            errors = o2.getErrors();
            errors[0].errorMessage.should.equal('Must be a or b');
        });

        it('should handle custom error in object format', function () {
            var SO = new SchemaObject({
                string: {
                    type: String,
                    enum: {
                        value: ['a', 'b'],
                        errorMessage: 'Must be a or b'
                    }
                }
            });
            var o = new SO({
                string: 'c'
            });

            should.not.exist(o.string);
            var errors = o.getErrors();
            errors.length.should.equal(1);
            errors[0].errorMessage.should.equal('Must be a or b');
            errors[0].errorCode.should.equal(1211);

            o.isErrors().should.equal(true);

            //Should have the custom error when creating a second instance
            var o2 = new SO({
                string: 'c'
            });

            errors = o2.getErrors();
            errors[0].errorMessage.should.equal('Must be a or b');
        });
    });

    describe('stringTransform', function () {
        var SO = new SchemaObject({
            string: {
                type: String,
                stringTransform: function (string) {
                    return string.toUpperCase();
                }
            }
        });

        it('should return lowercase', function () {
            var o = new SO();

            o.string = 'hello';
            o.string.should.equal('HELLO');
        });

        it('should always be passed a String object and not called if undefined or null', function () {
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

    describe('read only', function () {
        var SO = new SchemaObject({
            string: {
                type: String,
                readOnly: true,
                default: 'permanent value'
            }
        });

        it('should always be default value', function () {
            var o = new SO();
            o.string.should.equal('permanent value');
            o.string = 'hello';
            o.string.should.equal('permanent value');
        });
    });

    describe('minLength', function () {
        it('should not allow empty strings', function () {
            var SO = new SchemaObject({
                notEmptyString: {
                    type: String,
                    minLength: 1
                }
            });

            var o = new SO();
            o.notEmptyString = '';
            should.not.exist(o.notEmptyString);

            var errors = o.getErrors();
            errors.length.should.equal(1);
            errors[0].errorType.should.equal('ValidationError');
            errors[0].errorCode.should.equal(1212);

            o.notEmptyString = '1';
            o.notEmptyString.should.equal('1');
        });

        it('should allow custom error message in array format', function () {
            var SO = new SchemaObject({
                notEmptyString: {
                    type: String,
                    minLength: [1, 'notEmptyString cannot be empty']
                }
            });

            var o = new SO();
            o.notEmptyString = '';
            should.not.exist(o.notEmptyString);

            var errors = o.getErrors();
            errors.length.should.equal(1);
            errors[0].errorMessage.should.equal('notEmptyString cannot be empty');
            errors[0].errorType.should.equal('ValidationError');
            errors[0].errorCode.should.equal(1212);
        });

        it('should allow custom error message in object format', function () {
            var SO = new SchemaObject({
                notEmptyString: {
                    type: String,
                    minLength: {
                        value: 1,
                        errorMessage: 'notEmptyString cannot be empty'
                    }
                }
            });

            var o = new SO();
            o.notEmptyString = '';
            should.not.exist(o.notEmptyString);

            var errors = o.getErrors();
            errors.length.should.equal(1);
            errors[0].errorMessage.should.equal('notEmptyString cannot be empty');
            errors[0].errorType.should.equal('ValidationError');
            errors[0].errorCode.should.equal(1212);
        });
    });

    describe('maxLength', function () {
       it('should allow a max of 5 characters', function () {
            var SO = new SchemaObject({
                shortString: {
                    type: String,
                    maxLength: 5
                }
            });

            var o = new SO();
            o.shortString = '123456';
            should.not.exist(o.shortString);
            o.shortString = '1';
            o.shortString.should.equal('1');
        });

        it('should allow custom error message in array format', function () {
            var SO = new SchemaObject({
                shortString: {
                    type: String,
                    maxLength: [5, 'shortString cannot be longer than 5 characters']
                }
            });

            var o = new SO();
            o.shortString = '123456';
            should.not.exist(o.shortString);

            var errors = o.getErrors();
            errors.length.should.equal(1);
            errors[0].errorMessage.should.equal('shortString cannot be longer than 5 characters');
            errors[0].errorType.should.equal('ValidationError');
            errors[0].errorCode.should.equal(1213);
        });

        it('should allow custom error message in object format', function () {
            var SO = new SchemaObject({
                shortString: {
                    type: String,
                    maxLength: {
                        value: 5,
                        errorMessage: 'shortString cannot be longer than 5 characters'
                    }
                }
            });

            var o = new SO();
            o.shortString = '123456';
            should.not.exist(o.shortString);

            var errors = o.getErrors();
            errors.length.should.equal(1);
            errors[0].errorMessage.should.equal('shortString cannot be longer than 5 characters');
            errors[0].errorType.should.equal('ValidationError');
            errors[0].errorCode.should.equal(1213);

            //Should have same custom error on second instance
            var o2 = new SO();
            o2.shortString = '123456';
            errors = o2.getErrors();
            errors[0].errorMessage.should.equal('shortString cannot be longer than 5 characters');
        });
    });

    describe('maxLength + clip', function () {
        var SO = new SchemaObject({
            clippedString: {
                type: String,
                maxLength: 5,
                clip: true
            }
        });

        it('should clip string to 5 characters', function () {
            var o = new SO();
            o.clippedString = '123456';
            o.clippedString.should.equal('12345');
        });
    });
});

describe('Number', function () {
    var SO = new SchemaObject({
        number: Number,
        minMax: {
            type: Number,
            min: 100,
            max: 200
        }
    });

    describe('typecasting', function () {
        it('should typecast string to number', function () {
            var o = new SO();

            o.number = '123';
            o.number.should.be.a.Number;
            o.number.should.equal(123);

            o.number = o.number + 1;
            o.number.should.equal(124);

            o.number = 'a';
            o.number.should.equal(124);

            var errors = o.getErrors();
            errors.length.should.equal(1);
            errors[0].errorMessage.should.equal('Number could not be typecast from the provided String');
            errors[0].errorType.should.equal('CastError');
            errors[0].errorCode.should.equal(1102);
        });

        it('should typecast string with comma digit group separator to number', function () {
            var o = new SO();

            o.number = '123,988,123.01';
            o.number.should.be.a.Number;
            o.number.should.equal(123988123.01);

            o.number = o.number + 1;
            o.number.should.equal(123988124.01);
        });

        it('should fail to typecast string with decimal digit group separator to number', function () {
            var o = new SO();

            o.number = '123.988.123,01';
            should.not.exist(o.number);

            var errors = o.getErrors();
            errors.length.should.equal(1);
            errors[0].errorMessage.should.equal('Number could not be typecast from the provided String');
            errors[0].errorType.should.equal('CastError');
            errors[0].errorCode.should.equal(1102);
        });

        it('should typecast string with period digit group separator to number if option enabled', function () {
            var SO = new SchemaObject({
                number: Number,
                minMax: {
                    type: Number,
                    min: 100,
                    max: 200
                }
            }, {
                useDecimalNumberGroupSeparator: true
            });

            var o = new SO();

            o.number = '123.988.123,01';
            o.number.should.be.a.Number;
            o.number.should.equal(123988123.01);

            o.number = o.number + 1;
            o.number.should.equal(123988124.01);
        });

        it('should typecast boolean to number', function () {
            var o = new SO();

            o.number = false;
            o.number.should.be.a.Number;
            o.number.should.equal(0);

            o.number = true;
            o.number.should.be.a.Number;
            o.number.should.equal(1);
        });

        it('should not typecast undefined or null', function () {
            var o = new SO();

            o.number = 1;
            o.number.should.be.a.Boolean;
            o.number.should.equal(1);

            o.number = undefined;
            should.not.exist(o.number);

            o.number = null;
            should.not.exist(o.number);
        });
    });

    describe('min', function () {
        it('should reject values below min', function () {
            var o = new SO();

            o.minMax = 0;
            should.not.exist(o.minMax);
            o.getErrors().length.should.equal(1);
            o.isErrors().should.equal(true);

            o.minMax = 100;
            o.minMax.should.equal(100);

            o.minMax = 150;
            o.minMax.should.equal(150);
        });

        it('should handle custom errors in array format', function () {
            var SO = new SchemaObject({
                number: Number,
                minMax: {
                    type: Number,
                    min: [100, 'min is 100'],
                    max: 200
                }
            });
            var o = new SO();

            o.minMax = 0;
            should.not.exist(o.minMax);

            var errors = o.getErrors();
            errors.length.should.equal(1);

            o.isErrors().should.equal(true);

            errors[0].errorMessage.should.equal('min is 100');
            errors[0].errorCode.should.equal(1221);

            o.minMax = 100;
            o.minMax.should.equal(100);

            o.minMax = 150;
            o.minMax.should.equal(150);
        });

        it('should handle custom errors in object format', function () {
            var SO = new SchemaObject({
                number: Number,
                minMax: {
                    type: Number,
                    min: {
                        value:100,
                        errorMessage:'min is 100'
                    },
                    max: 200
                }
            });
            var o = new SO();

            o.minMax = 0;
            should.not.exist(o.minMax);

            var errors = o.getErrors();
            errors.length.should.equal(1);

            o.isErrors().should.equal(true);

            errors[0].errorMessage.should.equal('min is 100');
            errors[0].errorCode.should.equal(1221);

            o.minMax = 100;
            o.minMax.should.equal(100);

            o.minMax = 150;
            o.minMax.should.equal(150);
        });
    });

    describe('max', function () {
        it('should reject values above max', function () {
            var o = new SO();

            o.minMax = 300;
            should.not.exist(o.minMax);
            o.getErrors().length.should.equal(1);
            o.isErrors().should.equal(true);

            o.minMax = 200;
            o.minMax.should.equal(200);
        });

        it('should handle custom errors in array format', function () {
            var SO = new SchemaObject({
                number: Number,
                minMax: {
                    type: Number,
                    min: 100,
                    max: [200, 'max is 200']
                }
            });
            var o = new SO();

            o.minMax = 300;
            should.not.exist(o.minMax);

            var errors = o.getErrors();
            errors.length.should.equal(1);

            o.isErrors().should.equal(true);

            errors[0].errorMessage.should.equal('max is 200');
            errors[0].errorCode.should.equal(1222);
        });

        it('should handle custom errors in object format', function () {
            var SO = new SchemaObject({
                number: Number,
                minMax: {
                    type: Number,
                    min: 100,
                    max: {
                        value: 200,
                        errorMessage:'max is 200'
                    }
                }
            });
            var o = new SO();

            o.minMax = 300;
            should.not.exist(o.minMax);

            var errors = o.getErrors();
            errors.length.should.equal(1);

            o.isErrors().should.equal(true);

            errors[0].errorMessage.should.equal('max is 200');
            errors[0].errorCode.should.equal(1222);
        });
    });

    describe('numberTransform', function () {
        var SO = new SchemaObject({
            number: {
                type: Number,
                numberTransform: function (number) {
                    return Math.round(number);
                }
            }
        });

        it('should always round number', function () {
            var o = new SO();

            o.number = 13.2;
            o.number.should.equal(13);
        });

        it('should always be passed a Number object and not called if undefined or null', function () {
            var o = new SO();

            o.number = 'not a number';
            should.not.exist(o.date);

            o.number = undefined;
            should.not.exist(o.date);

            o.number = null;
            should.not.exist(o.date);
        });
    });

    describe('Errors', function () {
        var SOD = new SchemaObject({
            number: {
                type: Number,
                min: 5,
                max: 6
            }
        });

        var SOC = new SchemaObject({
            number: {
                type: Number,
                min: [5, 'number cannot be smaller than 5'],
                max: [6, 'number cannot be larger than 6']
            }
        });

        var SOO = new SchemaObject({
            number: {
                type: Number,
                min: {
                    value: 5,
                    errorMessage: 'number cannot be smaller than 5'
                },
                max: {
                    value: 6,
                    errorMessage: 'number cannot be larger than 6'
                }
            }
        });

        var ComplicatedSchema = new SchemaObject({
            number1: {
                type: Number,
                min: 5,
            },
            number2: {
                type: Number,
                min: [5, 'number cannot be smaller than 5'],
            },
            number3: {
                type: Number,
                min: {
                    value: 5,
                    errorMessage: 'number cannot be smaller than 5'
                }
            },
            subObject: {
                string1: {
                    type: String,
                    maxLength: 5
                },
                string2: {
                    type: String,
                    maxLength: [5, 'max length is 5']
                },
                string3: {
                    type: String,
                    maxLength: {
                        value: 5,
                        errorMessage: 'max length is 5'
                    }
                }
            },
            array1: [{
                type: String,
                maxLength: 5
            }],
            array2: [{
                type: String,
                maxLength: [5, 'max length is 5']
            }],
            array3: [{
                type: String,
                maxLength: {
                    value: 5,
                    errorMessage: 'max length is 5'
                }
            }],
            arrayObject: [{
                string1: {
                    type: String,
                    maxLength: 5
                },
                string2: {
                    type: String,
                    maxLength: [5, 'max length is 5']
                },
                string3: {
                    type: String,
                    maxLength: {
                        value: 5,
                        errorMessage: 'max length is 5'
                    }
                }
            }]
        });

        it('should return default min error', function () {
            var o = new SOD({
                number: 1
            });
            var errors = o.getErrors();
            errors.length.should.equal(1);

            errors[0].errorMessage.should.equal('Number is too small to meet min requirement.');
            errors[0].errorType.should.equal('ValidationError');
            errors[0].errorCode.should.equal(1221);
        });

        it('should return custom min error', function () {
            var o = new SOC({
                number: 1,
            });
            var errors = o.getErrors();
            errors.length.should.equal(1);

            errors[0].errorMessage.should.equal('number cannot be smaller than 5');
            errors[0].errorType.should.equal('ValidationError');
            errors[0].errorCode.should.equal(1221);
        });

        it('should return default max error', function () {
            var o = new SOD({
                number: 7
            });
            var errors = o.getErrors();
            errors.length.should.equal(1);

            errors[0].errorMessage.should.equal('Number is too big to meet max requirement.');
            errors[0].errorType.should.equal('ValidationError');
            errors[0].errorCode.should.equal(1222);
        });

        it('should return custom max error in array format', function () {
            var o = new SOC({
                number: 7
            });
            var errors = o.getErrors();
            errors.length.should.equal(1);

            errors[0].errorMessage.should.equal('number cannot be larger than 6');
            errors[0].errorType.should.equal('ValidationError');
            errors[0].errorCode.should.equal(1222);
        });

        it('should return custom max error in object format', function () {
            var o = new SOO({
                number: 7
            });
            var errors = o.getErrors();
            errors.length.should.equal(1);

            errors[0].errorMessage.should.equal('number cannot be larger than 6');
            errors[0].errorType.should.equal('ValidationError');
            errors[0].errorCode.should.equal(1222);
        });

        it('should handle both error formats as well as errors in sub-objects', function () {
            var o = new ComplicatedSchema({
                number1: 1,
                number2: 2,
                number3: 3,
                subObject: {
                    string1: 'longerThan5',
                    string2: 'longerThan5Also',
                    string3: 'longerThan5Too',
                },
                array1: ['longerThan5'],
                array2: ['longerThan5'],
                array3: ['longerThan5'],
                arrayObject: [{
                    string1: 'muchLongerThan5',
                    string2: 'muchLongerThan5Also',
                    string3: 'muchLongerThan5Too',
                },{
                    string1: 'good',
                    string2: 'small',
                    string3: 'tiny',
                }]
            });

            var errors = o.getErrors();
            //This number will increase by 3 once there is a fix for arrayObject errors not being populated
            errors.length.should.equal(9);

            //Top level default error
            errors[0].errorMessage.should.equal('Number is too small to meet min requirement.');
            errors[0].errorType.should.equal('ValidationError');
            errors[0].errorCode.should.equal(1221);

            //Top level custom error array
            errors[1].errorMessage.should.equal('number cannot be smaller than 5');
            errors[1].errorType.should.equal('ValidationError');
            errors[1].errorCode.should.equal(1221);

            //Top level custom error object
            errors[2].errorMessage.should.equal('number cannot be smaller than 5');
            errors[2].errorType.should.equal('ValidationError');
            errors[2].errorCode.should.equal(1221);

            //Sub-object default error
            errors[3].errorMessage.should.equal('String length too long to meet maxLength requirement.');
            errors[3].errorType.should.equal('ValidationError');
            errors[3].errorCode.should.equal(1213);

            //Sub-object custom error array
            errors[4].errorMessage.should.equal('max length is 5');
            errors[4].errorType.should.equal('ValidationError');
            errors[4].errorCode.should.equal(1213);

            //Sub-object custom error object
            errors[5].errorMessage.should.equal('max length is 5');
            errors[5].errorType.should.equal('ValidationError');
            errors[5].errorCode.should.equal(1213);

            //Array-string default error
            errors[6].errorMessage.should.equal('String length too long to meet maxLength requirement.');
            errors[6].errorType.should.equal('ValidationError');
            errors[6].errorCode.should.equal(1213);

            //Array-string custom error array
            errors[7].errorMessage.should.equal('max length is 5');
            errors[7].errorType.should.equal('ValidationError');
            errors[7].errorCode.should.equal(1213);

            //Array-string custom error object
            errors[8].errorMessage.should.equal('max length is 5');
            errors[8].errorType.should.equal('ValidationError');
            errors[8].errorCode.should.equal(1213);
        });
    });


    describe('misc', function () {
        it('should allow zero even with allowFalsyValues set false', function () {
            var SO = new SchemaObject({
                number: Number
            }, {
                allowFalsyValues: false
            });

            var o = new SO({number: 0});
            var errors = o.getErrors();
            errors.length.should.equal(0);
        });
    });
});

describe('Boolean', function () {
    describe('typecasting', function () {
        var SO = new SchemaObject({
            boolean: Boolean
        });

        it('should typecast string to boolean', function () {
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

        it('should typecast number to boolean', function () {
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

        it('should not typecast undefined or null', function () {
            var o = new SO();

            o.boolean = true;
            o.boolean.should.be.a.Boolean;
            o.boolean.should.equal(true);

            o.boolean = undefined;
            should.not.exist(o.boolean);

            o.boolean = null;
            should.not.exist(o.boolean);
        });
    });

    describe('booleanTransform', function () {
        var SO = new SchemaObject({
            boolean: {
                type: Boolean,
                booleanTransform: function (boolean) {
                    return !boolean;
                }
            }
        });

        it('should always reverse boolean', function () {
            var o = new SO();

            o.boolean = true;
            o.boolean.should.equal(false);
        });
    });
});

describe('Object', function () {
    describe('accessing properties', function () {
        var SO = new SchemaObject({
            anObject: {}
        });

        it('should set properties without initializing object', function () {
            var o = new SO();

            o.anObject.prop = 123;
            should.exist(o.anObject.prop);
            o.anObject.prop.should.equal(123);
        });
    });

    describe('schema', function () {
        var Profile = new SchemaObject({
            firstName: String,
            age: Number,
            notEmptyString: {
                type: String,
                minLength: 1
            },
            rootTest: {
                type: 'any',
                getter: function () {
                    return this.age;
                }
            }
        });
        var SO = new SchemaObject({
            age: Number,
            profile: Profile,
            shorthandProfile: {
                firstName: String,
                age: Number,
                name: 'string',
                notEmptyString: {
                    type: String,
                    minLength: 1
                },
                rootTest: {
                    type: 'any',
                    getter: function () {
                        // Should return age from the root object.
                        return this.age;
                    }
                }
            }
        }, {
            toObject: function (obj) {
                return {
                    age: obj.shorthandProfile.age
                };
            }
        });

        it('should allow nested schemas', function () {
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

        it('should allow default values', function () {
            var ModelWithDefaults = new SchemaObject({
                profile: {
                    type: Profile,
                    default: function () {
                        return new Profile({
                            firstName: 'Jane'
                        });
                    }
                }
            });

            var m = new ModelWithDefaults();

            m.profile.firstName.should.equal('Jane');
        });

        it('should allow shorthand declaration of nested schema', function () {
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

        it('should not inherit toObject when nested schema is used', function () {
            var o = new SO();

            o.shorthandProfile.age = 50;
            var obj = o.toObject();
            obj.age.should.equal(50);
        });

        it('should NOT set "this" to root object when nested schema shorthand is NOT used', function () {
            var o = new SO();
            var o2 = new SO();

            o.age = 20;
            o.profile.age = 60;
            o2.age = 50;
            o2.profile.age = 30;

            o.profile.rootTest.should.equal(60);
            o2.profile.rootTest.should.equal(30);
        });

        it('should set "this" to root object when nested schema shorthand is used', function () {
            var o = new SO();
            var o2 = new SO();

            o.age = 20;
            o.shorthandProfile.age = 60;
            o2.age = 50;
            o2.shorthandProfile.age = 30;

            o.shorthandProfile.rootTest.should.equal(20);
            o2.shorthandProfile.rootTest.should.equal(50);
        });

        it('should allow shorthand declaration of nested schema to use "name" index', function () {
            var o = new SO();

            o.shorthandProfile.name = 123;
            o.shorthandProfile.name.should.be.a.String;
            o.shorthandProfile.name.should.equal('123');
        });
    });
});

describe('Array', function () {
    describe('construction', function () {
        it('should allow you to pass an array to SchemaObject constructor for Array-type fields', function () {
            var SO = new SchemaObject({
                strings: [String]
            });

            var o = new SO({
                strings: ['hello', 'world']
            });
            o.strings.should.have.lengthOf(2);
            o.strings[0].should.be.a.String;
            o.strings[0].should.equal('hello');
            o.strings[1].should.be.a.String;
            o.strings[1].should.equal('world');
        });

        it('should allow you to pass an array to SchemaObject constructor for Array-type fields within other objects', function () {
            var SO = new SchemaObject({
                obj: {
                    strings: [String]
                }
            });

            var o = new SO({
                obj: {
                    strings: ['hello', 'world']
                }
            });
            o.obj.strings.should.have.lengthOf(2);
            o.obj.strings[0].should.be.a.String;
            o.obj.strings[0].should.equal('hello');
            o.obj.strings[1].should.be.a.String;
            o.obj.strings[1].should.equal('world');
        });
    });

    describe('accessing properties', function () {
        var SO = new SchemaObject({
            strings: [String]
        });

        it('should set properties without initializing array', function () {
            var o = new SO();

            o.strings.push(123);
            o.strings[0].should.equal('123');
        });
    });

    describe('typecasting', function () {
        var SO = new SchemaObject({
            strings: [String],
            transformedStrings: [{
                type: String,
                stringTransform: function (string) {
                    return string.toLowerCase();
                }
            }],
            profiles: [{
                firstName: String,
                lastName: String
            }]
        });

        it('should typecast all array elements to string', function () {
            var o = new SO();

            o.strings.push(123);
            o.strings.should.have.lengthOf(1);
            o.strings[0].should.be.a.String;
            o.strings[0].should.equal('123');
        });

        it('should typecast Array when set to instance of existing array', function () {
            var o = new SO();
            o.strings = [123, 321];

            o.strings.should.be.an.instanceof(Array);
            o.strings[0].should.be.a.String;
            o.strings[0].should.equal('123');
            o.strings[1].should.be.a.String;
            o.strings[1].should.equal('321');
        });

        it('should transform all strings to lowercase', function () {
            var o = new SO();

            o.transformedStrings.push('HELLO');
            o.transformedStrings.should.have.lengthOf(1);
            o.transformedStrings[0].should.be.a.String;
            o.transformedStrings[0].should.equal('hello');
        });

        it('should allow you to set new schema objects', function () {
            var o = new SO();

            o.profiles = [{
                firstName: 'Scott',
                lastName: 'Hovestadt'
            }, {
                firstName: 1234,
                lastName: 4321
            }];
            o.profiles.should.have.lengthOf(2);
            o.profiles[0].firstName.should.equal('Scott');
            o.profiles[0].lastName.should.equal('Hovestadt');
            o.profiles[1].firstName.should.be.a.String;
            o.profiles[1].firstName.should.equal('1234');
            o.profiles[1].lastName.should.be.a.String;
            o.profiles[1].lastName.should.equal('4321');

            o.profiles = [{
                firstName: 'Replaced',
                lastName: 'Elements'
            }];
            o.profiles.should.have.lengthOf(1);
            o.profiles[0].firstName.should.equal('Replaced');
            o.profiles[0].lastName.should.equal('Elements');
        });

        it('should allow you to push() in new schema objects', function () {
            var o = new SO();

            o.profiles.push({
                firstName: 4321
            });
            o.profiles.should.have.lengthOf(1);
            o.profiles[0].firstName.should.be.a.String;
            o.profiles[0].firstName.should.equal('4321');
        });

        it('should enforce types on existing array elements', function () {
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

    describe('unique', function () {
        var SO = new SchemaObject({
            uniqueStrings: {
                type: Array,
                unique: true,
                arrayType: String
            },
            unique: {
                type: Array,
                unique: true
            }
        });

        it('should enforce unique values within array with typecasting', function () {
            var o = new SO();

            o.uniqueStrings.push(1234);
            o.uniqueStrings.should.have.lengthOf(1);
            o.uniqueStrings.push('1234');
            o.uniqueStrings.should.have.lengthOf(1);
            o.uniqueStrings.push('12345');
            o.uniqueStrings.should.have.lengthOf(2);
        });

        it('should enforce unique values within array without typecasting', function () {
            var o = new SO();

            o.unique.push('scott');
            o.unique.should.have.lengthOf(1);
            o.unique.push('scott');
            o.unique.should.have.lengthOf(1);
            o.unique.push('Scott');
            o.unique.should.have.lengthOf(2);
        });
    });

    describe('filter', function () {
        var SO = new SchemaObject({
            filtered: {
                type: Array,
                arrayType: String,
                filter: function (str) {
                    return str.toLowerCase() === str;
                }
            }
        });

        it('should filter array to only lowercase strings when push used', function () {
            var o = new SO();
            o.filtered.push('SCOTT');
            o.filtered.should.have.lengthOf(0);
            o.filtered.push('scott');
            o.filtered.should.have.lengthOf(1);
        });

        it('should filter array to only lowercase strings when set to instance of existing array', function () {
            var o = new SO();
            var arr = ['SCOTT', 'scott'];
            o.filtered = arr;
            o.filtered.should.have.lengthOf(1);
            arr.should.have.lengthOf(2);
        });
    });

    describe('Array prototype', function () {
        var SO = new SchemaObject({
            verified: [String],
            unverified: [String]
        });

        it('concat', function () {
            var o = new SO();
            o.verified = ['hello'];
            o.unverified = ['world'];
            var all = o.verified.concat(o.unverified, ['!']);
            all.should.be.an.instanceOf(Array);
            all.should.have.property('toArray');
            all.should.have.lengthOf(3);
            all[0].should.be.a.String;
            all[0].should.equal('hello');
            all[1].should.be.a.String;
            all[1].should.equal('world');
            all[2].should.be.a.String;
            all[2].should.equal('!');
            o.verified.should.have.lengthOf(1);
            o.verified[0].should.equal('hello');
            o.unverified.should.have.lengthOf(1);
            o.unverified[0].should.equal('world');
        });
    });

    describe('toArray', function () {
        var SO = new SchemaObject({
            strings: {
                type: Array,
                unique: true,
                arrayType: String
            }
        });

        it('should return native Array', function () {
            var o = new SO();

            o.strings.push(1234);
            var array = o.strings.toArray();
            array.should.be.an.instanceOf(Array);
            array.should.not.have.property('toArray');
            array[0].should.be.equal('1234');
        });

        it('should be used for serializing an object to JSON', function () {
            var o = new SO();

            o.strings.push(1234);
            var arrayStr = JSON.stringify(o.strings.toArray());
            var jsonArrStr = JSON.stringify(o.strings);
            arrayStr.should.equal(jsonArrStr);
        });
    });
});

describe('Date', function () {
    describe('typecasting', function () {
        var SO = new SchemaObject({
            date: Date
        });

        it('should accept Date type', function () {
            var o = new SO();

            var now = new Date();
            o.date = now;
            o.date.should.be.an.instanceof(Date);
            o.date.getMonth().should.equal(now.getMonth());
            o.date.getDate().should.equal(now.getDate());
            o.date.getFullYear().should.equal(now.getFullYear());
        });

        it('should typecast string "June 21, 1988" to date', function () {
            var o = new SO();

            o.date = 'June 21, 1988';
            o.date.should.be.an.instanceof(Date);
            o.date.getMonth().should.equal(5);
            o.date.getDate().should.equal(21);
            o.date.getFullYear().should.equal(1988);
        });

        it('should typecast string "06/21/1988" to date', function () {
            var o = new SO();

            o.date = '06/21/1988';
            o.date.should.be.an.instanceof(Date);
            o.date.getMonth().should.equal(5);
            o.date.getDate().should.equal(21);
            o.date.getFullYear().should.equal(1988);
        });

        it('should typecast string "6/21/1988" to date', function () {
            var o = new SO();

            o.date = '6/21/1988';
            o.date.should.be.an.instanceof(Date);
            o.date.getMonth().should.equal(5);
            o.date.getDate().should.equal(21);
            o.date.getFullYear().should.equal(1988);
        });

        it('should reject nonsense strings', function () {
            var o = new SO();

            o.date = 'not a date';
            should.not.exist(o.date);
            o.getErrors().length.should.equal(1);
            o.isErrors().should.equal(true);
        });

        it('should typecast integer timestamp seconds to date', function () {
            var o = new SO();

            o.date = 582879600;
            o.date.should.be.an.instanceof(Date);
            o.date.getTime().should.equal(582879600000);
            o.date.getMonth().should.equal(5);
            o.date.getDate().should.equal(21);
            o.date.getFullYear().should.equal(1988);
        });

        it('should typecast integer timestamp milliseconds to date', function () {
            var o = new SO();

            o.date = 582879600000;
            o.date.should.be.an.instanceof(Date);
            o.date.getTime().should.equal(582879600000);
            o.date.getMonth().should.equal(5);
            o.date.getDate().should.equal(21);
            o.date.getFullYear().should.equal(1988);
        });

        it('should reject boolean', function () {
            var o = new SO();

            o.date = true;
            should.not.exist(o.date);
            o.getErrors().length.should.equal(1);
            o.isErrors().should.equal(true);

            o.date = false;
            should.not.exist(o.date);
            o.getErrors().length.should.equal(2);
            o.isErrors().should.equal(true);
        });

        it('should reject array', function () {
            var o = new SO();

            o.date = ['h', 'e', 'l', 'l', 'o'];
            should.not.exist(o.date);
            o.getErrors().length.should.equal(1);
            o.isErrors().should.equal(true);
        });

        it('should reject object', function () {
            var o = new SO();

            o.date = {
                0: 'h',
                1: 'e',
                2: 'l',
                3: 'l',
                4: 'o'
            };
            should.not.exist(o.date);
            o.getErrors().length.should.equal(1);
            o.isErrors().should.equal(true);
        });

        it('should set to undefined if set with empty string, null, 0, false, or undefined', function () {
            var o = new SO();

            o.date = '6/21/1988';
            o.date = '';
            should.not.exist(o.date);

            o.date = '6/21/1988';
            o.date = null;
            should.not.exist(o.date);

            o.date = '6/21/1988';
            o.date = undefined;
            should.not.exist(o.date);

            o.getErrors().length.should.equal(0);
            o.isErrors().should.equal(false);
        });

        // https://github.com/scotthovestadt/node-schema-object/issues/5
        it('should correctly parse dates before 1970', function () {
            var o = new SO();

            o.date = '03/02/1959';
            o.date.getMonth().should.equal(2);
            o.date.getDate().should.equal(2);
            o.date.getFullYear().should.equal(1959);
        });
    });

    describe('dateTransform', function () {
        var SO = new SchemaObject({
            date: {
                type: Date,
                dateTransform: function (date) {
                    date.setFullYear(2000);
                    return date;
                }
            }
        });

        it('should always return date with year 2000 but other properties untouched', function () {
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

        it('should always be passed a Date object and not called if undefined or null', function () {
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

describe('populate()', function () {
    it('should populate object', function () {
        var User = new SchemaObject({
            firstName: String,
            lastName: String
        });

        var user = new User();
        user.populate({
            firstName: 'Scott',
            lastName: 'Hovestadt'
        });
        user.firstName.should.equal('Scott');
        user.lastName.should.equal('Hovestadt');
    });
});

describe('clear()', function () {
    it('should return array elements to their original state, which is an empty array', function () {
        var SO = new SchemaObject({
            strings: [String]
        });

        var o = new SO();
        o.strings.push('hello');
        o.strings.should.have.lengthOf(1);
        o.clear();
        o.strings.should.have.lengthOf(0);
    });
});

describe('toObject()', function () {
    var SO = new SchemaObject({
        string: String,
        date: Date,
        invisible: {
            type: String,
            invisible: true
        },
        schemaObject: {
            string: String,
            anotherObject: {
                name: String,
                zip: Number
            }
        },
        anyObj: Object,
        schemaObjects: [{
            string: String
        }],
        arrayOfStrings: [String],
        magicDate: {
            type: Date,
            getter: function (date) {
                if (date) {
                    return date.getTime();
                }
            }
        }
    });

    it('should return undefined for empty String field', function () {
        var o = new SO();
        var obj = o.toObject();

        (obj.string === undefined).should.be.true;
    });

    it('should have index "string" with value "1234"', function () {
        var o = new SO();

        o.string = 1234;
        var obj = o.toObject();
        obj.string.should.be.a.String;
        obj.string.should.equal('1234');
    });

    it('should write Date object for Date type', function () {
        var o = new SO();

        o.date = 582879600000;
        var obj = o.toObject();
        obj.date.should.be.an.instanceof(Date);
        obj.date.getTime().should.equal(582879600000);
        obj.date.getMonth().should.equal(5);
        obj.date.getDate().should.equal(21);
        obj.date.getFullYear().should.equal(1988);
    });

    it('should write getter when getter returns different type', function () {
        var o = new SO();

        o.magicDate = 'Tue Jun 21 1988 00:00:00 GMT-0700 (PDT)';
        var obj = o.toObject();
        obj.magicDate.should.be.an.instanceof(Number);
        obj.magicDate.should.equal(582879600000);
    });

    it('should write Arrays for Array type', function () {
        var o = new SO();
        o.arrayOfStrings = ['hello', 'world'];

        var obj = o.toObject();
        obj.arrayOfStrings.should.be.an.instanceof(Array);
        obj.arrayOfStrings[0].should.equal('hello');
        obj.arrayOfStrings[1].should.equal('world');
    });

    it('should convert nested SchemaObjects to primitive Object', function () {
        var o = new SO();

        o.schemaObject.string = 1234;
        var obj = o.toObject();
        obj.schemaObject.string.should.be.a.String;
        obj.schemaObject.string.should.equal('1234');
        obj.schemaObject.should.be.an.Object;
        obj.schemaObject.should.should.not.have.property('toObject');
    });

    it('should convert SchemaObjects nested within Arrays to primitive Objects', function () {
        var o = new SO();

        o.schemaObjects.push({
            string: 1234
        });
        var obj = o.toObject();
        obj.schemaObjects[0].string.should.be.a.String;
        obj.schemaObjects[0].string.should.equal('1234');
        obj.schemaObjects[0].should.be.an.Object;
        obj.schemaObjects[0].should.not.have.property('toObject');
    });

    it('should not write invisible indexes', function () {
        var o = new SO();

        o.invisible = 'hello';
        o.invisible.should.be.a.String;
        o.invisible.should.equal('hello');
        var obj = o.toObject();
        should.not.exist(obj.invisible);
    });

    it('should be called for serializing an object to JSON', function () {
        var o = new SO();
        o.string = 'hello';
        o.date = new Date();
        o.arrayOfStrings.push('1');
        o.arrayOfStrings.push(1234);
        o.schemaObject.string = 'test';
        o.schemaObjects.push({
            string: 1234
        });

        var obj = JSON.stringify(o.toObject());
        var jsonObject = JSON.stringify(o);
        obj.should.equal(jsonObject);
    });

    it('should be called for serializing a sub-SchemaObject to JSON', function () {
        var o = new SO();
        o.schemaObject.string = 'test';
        o.schemaObject.anotherObject.name = 'hello';
        o.schemaObject.anotherObject.zip = 'hello';

        var obj = JSON.stringify(o.schemaObject.toObject());
        var jsonObject = JSON.stringify(o.schemaObject);
        obj.should.equal(jsonObject);
    });

    it('should not write undefined values to object when option setUndefined: false (default)', function () {
        var o = new SO();
        var obj = o.toObject();
        _.keys(obj).length.should.equal(0);
    });

    it('should write undefined values to object when option setUndefined: true', function () {
        var SO = new SchemaObject({
            string: String,
            arr: [],
            obj: {
                str: String
            }
        }, {
            setUndefined: true
        });

        var o = new SO();
        var obj = o.toObject();
        _.keys(obj).length.should.equal(3);
    });

    it('should output null values', function () {
        var o = new SO();
        o.string = null;
        var obj = o.toObject();
        should.equal(o.string, null);
    });

    if (_isProxySupported === true) {
        it('should write non-schema indexes when strict mode is off', function () {
            var SO = new SchemaObject({}, {
                strict: false
            });

            var o = new SO();
            o.randomIndex = 123;
            var obj = o.toObject();
            obj.randomIndex.should.equal(123);
        });

        it('strict mode false should be inherited by shorthand sub-SchemaObjects', function () {
            var SO = new SchemaObject({
                schemaObject: {
                    string: String
                },
                schemaObjects: [{
                    string: String
                }]
            }, {
                strict: false
            });

            var o = new SO();
            o.schemaObject.new = '123';
            o.schemaObject.new.should.equal('123');
            o.schemaObjects.push({
                new: '123'
            });
            o.schemaObjects[0].new.should.equal('123');
        });

        it('strict mode true should be inherited by shorthand sub-SchemaObjects', function () {
            var SO = new SchemaObject({
                schemaObject: {
                    string: String
                },
                schemaObjects: [{
                    string: String
                }]
            }, {
                strict: true
            });

            var o = new SO();
            o.schemaObject.new = '123';
            should.not.exist(o.schemaObject.new);
            o.schemaObjects.push({
                new: '123'
            });
            should.not.exist(o.schemaObjects[0].new);
        });

        it('should write non-schema dot notation deep indexes when strict mode is off', function () {
            var SO = new SchemaObject({}, {
                strict: false,
                dotNotation: true
            });

            var o = new SO();
            o['random.index'] = 123;
            var obj = o.toObject();
            obj.random.index.should.equal(123);
        });
    }
});

describe('clone()', function () {
    var SO = new SchemaObject({
        string: String,
        subobj: {
            string: String
        },
        subarr: [String]
    });

    it('should clone object, subobjects, and arrays', function () {
        var o = new SO({
            string: 'hello',
            subobj: {
                string: 'world'
            },
            subarr: ['!']
        });

        const o2 = o.clone();
        o2._isSchemaObject().should.equal(true);

        o2.string = 'HELLO';
        o2.string.should.equal('HELLO');
        o.string.should.equal('hello');

        o2.subobj.string = 'WORLD';
        o2.subobj.string.should.equal('WORLD');
        o.subobj.string.should.equal('world');

        o2.subarr[0] = '!!!';
        o2.subarr[0].should.equal('!!!');
        o.subarr[0].should.equal('!');
    });
});

describe('getErrors()', function () {
    it('should get errors from sub-SchemaObjects', function () {
        var SO = new SchemaObject({
            string: {
                type: String,
                minLength: 15
            },
            subobj: {
                string: {
                    type: String,
                    minLength: 15
                }
            }
        });

        var o = new SO();
        o.string = '1234';
        o.subobj.string = '1234';

        const errors = o.getErrors();
        errors.length.should.equal(2);
        (errors[0].schemaObject === o).should.be.true();
        errors[0].fieldSchema.name.should.equal('string');
        (errors[1].schemaObject === o).should.be.true();
        errors[1].fieldSchema.name.should.equal('subobj.string');
        o.isErrors().should.equal(true);
        o.clearErrors();
        o.getErrors().length.should.equal(0);
        o.isErrors().should.equal(false);
    });
});

describe('clearErrors()', function () {
    it('should remove all errors on an object', function () {
        var SO = new SchemaObject({
            string: {
                type: String,
                minLength: 15
            }
        });

        var o = new SO();
        o.string = '1234';
        o.getErrors().length.should.equal(1);
        o.isErrors().should.equal(true);
        o.clearErrors();
        o.getErrors().length.should.equal(0);
        o.isErrors().should.equal(false);
    });
});

describe('type definition', function () {
    it('should allow custom type definition by passing SchemaObject properties', function () {
        var MyString = {
            type: String,
            minLength: 5,
            maxLength: 10
        };
        var SO = new SchemaObject({
            customString: MyString
        });

        var o = new SO();
        o.customString = '1234';
        should.not.exist(o.customString);
        o.customString = '12345';
        o.customString.should.equal('12345');

        o.customString = '1234567890';
        o.customString.should.equal('1234567890');
    });

    it('should allow custom type definition using properties hash with "type" property containing SchemaObject properties and merge provided properties into SchemaObject properties', function () {
        var MyString = {
            type: String,
            minLength: 5,
            maxLength: 10
        };
        var SO = new SchemaObject({
            customString: {
                type: MyString,
                maxLength: 15
            }
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

    it('should allow multiple custom type definitions with the same SchemaObject properties object', function () {
        var MyString = {
            type: String,
            minLength: 5,
            maxLength: 10
        };
        var SO = new SchemaObject({
            string: MyString,
            anotherString: MyString
        });

        var o = new SO();

        should.not.exist(o.string);
        o.string = '1234';
        should.not.exist(o.string);
        o.string = '12345';
        o.string.should.equal('12345');

        should.not.exist(o.anotherString);
        o.anotherString = '4321';
        should.not.exist(o.anotherString);
        o.anotherString = '43210';
        o.anotherString.should.equal('43210');
    });
});
