var SchemaObject = require('../dist/schemaobject');

var SO = new SchemaObject({
  id: String,
  profile: {
    firstName: String,
    lastName: String
  },
  identities: [{
    providerUID: String,
    subArr: [String]
  }],
  otherStuff: {
    hello: String
  },
  arr: [String]
});

var data = {
  id: '123'
};
var start = Date.now();
var o;
for(var i = 0; i < 100000; i++) {
  o = new SO(data);
}
console.log((Date.now() - start) / 1000);