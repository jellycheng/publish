'use strict';

var fs = require('fs'), path = require('path'), util = require('util');
var log = require('./log.js');
var _ = module.exports;

_.extend = function(sub){
    [].slice.call(arguments, 1).forEach(function(_super){
        for(var i in _super){
            sub[i] = _super[i];
        } 
    });

    return sub;
};

_.exists = fs.existsSync || path.existsSync;

_.read = function(file, encoding){
    if(!_.exists(file)){
        log.warn(util.format('unable to read file[%s]: No such file or directory.', file));
        return false;
    }

    if(!encoding){
        encoding = 'utf8';
    }

    var content = false;

    try{
        content = fs.readFileSync(file, encoding);
    }catch(e){
        log.error(e);
    }

    return content;
};

_.readJson = function(file, encoding){
    var json = _.read(file, encoding);

    if(json === false){
        return {};
    }

    return JSON.parse(json);
};

_.mkdir = function(dir, mode){
    if(_.exists(dir)){
        return true;
    }

    if(typeof mode === 'undefined'){
        //511 === 0777
        mode = 511 & (~process.umask());
    }

    path.normalize(dir).split(path.sep).reduce(function(prev, next){
        prev && _._mkdir(prev, mode);
        return prev + '/' + next;
    });

    return _._mkdir(dir);
};

_._mkdir = function(dir, mode){
    if(!_.exists(dir)){
        try{
            fs.mkdirSync(dir, mode);
        }catch(e){
            log.error(e);
        }
    }
};

_.write = function(file, data, append, options){
    if(!_.exists(file)){
        _.mkdir(path.dirname(file));
    }

    try{
        if(append){
            fs.appendFileSync(file, data, options);
        }else{
            fs.writeFileSync(file, data, options);
        }
    }catch(e){
        log.error(e);
    }
};

_.writeJson = function(file, data, options){
    if(typeof data == 'object'){
        data = JSON.stringify(data);
    }

    _.write(file, data, false, options);
};

_.empty = function(obj){
    if(Array.isArray(obj)) return !obj.length;

    for(var i in obj){
        if(obj.hasOwnProperty(i)){
            return false;
        }
    }

    return true;
};