A frontend document site builder.

I am still working on this. So take your own risk to use it.

## Installation

````
$ npm install docool -g
````

## Usage
The first thing you need to do is create a docool.json in you project. The following is all the configuration

````
{
    /**
     * same with gulp src.
     */
    "gulpSrc": [],

    /**
     * see the plugins descripton
     */
    "plugins": [],

	
    "server": {

        /**
         * see the server.path description
         */
        "path": ""

        /**
         * document site server port
         */
        "port": 3000,

        /**
         * see the server.entry description
         */
        "entry": "main.js"
    }
}
````
### server
you can decide how your document site works. It means you have Complete control of your site.

In order to do this. you need to confige your sever in docool.json.

For example, you can crate a folder named docool in the root directory of your project.

````
// In docool.json

{
  "server": {
	"path": "docool/"
  }
}
```` 

The next thing you need to do is to create a entry file in "docool/". for example main.js

Your entry file must export to function.

````
/**
 * init will called when the docool firstly finish parsing files.
 * So you can init your site in here
 *
 * @param {Object} docool 
 */
exports.init = () => {
}

/**
 *
 * @param {Array} doclets
 */
exports.loadDoclets = (doclets) {
}
````

### pulgins
In the entire parsing cycle, docool will emit some events to allow you to do some change.

docool can parse two type of files, js(jsx) and md. so for the js file, docool will emit 'js::eventName' kind of event. and for the md will like 'md::eventName'

If you want to write your own plugins, you can create a plugins forlder in your server folder.
then create a plugin file, for example, called test.plugin.js.

````
 exports.handlers = {
   'event1': function handler(e) {
   },
   'event2': function handler(e) {
   }
 }
````

