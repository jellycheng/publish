var spawn = require('child_process').spawn, path = require('path');
var _ = require('../lib/util.js'), log = require('../lib/log.js');
var Q = require('q');
var stores = [];

var Task = module.exports = function(info, quiet){
    var root;
    var deferred = Q.defer();

    info.status = 'processing';

    if(!quiet){
        stores.push(info);
        Task.emit('start', info);
    }

    if(info.cwd){
        root = path.normalize(info.cwd);
        _.mkdir(root);
    }else{
        root = process.cwd();
    }

    info.startTime = Date.now();
    
    var proc = spawn(info.cmd, info.args || [], {
        cwd: root, 
        env: process.env
    });  

    var result = '', debug = info.debug;

    proc.stdout.on('data', function(data){
        result += (data || '').toString();
    });

    proc.stderr.on('data', function(data){
        data = data ? data.toString() : '';

        if(info.cmd == 'git'){
            if(!/^(error|fatal):/.test(data)){
                result += data;
                return;
            }
        }

        proc.kill();
        info.status = 'error';
        info.errorMsg = data;
        deferred.reject(info);
    });

    proc.on('close', function(code){
        info.msg = result;
        info.closeTime = Date.now();     

        if(code === 0){
            info.status = 'success';
            deferred.resolve(info);
        }

        !quiet && process.nextTick(function(){
            Task.emit('close', info);
        })
    });

    return deferred.promise;
};

var eventEmitter = require('events').EventEmitter;
_.extend(Task, eventEmitter.prototype);

Task.get = function(count){
    if(count){
        count = -count;
    }else{
        count = 0;
    }

    return stores.slice(count).reverse();
};

Task.GC_TIME = 1000 * 60 * 60 * 3;

/**
 * 垃圾回收， 清除执行已超过固定时间的任务
 * @return {[type]} [description]
 */
Task.gc = function(){
    var now = Date.now();

    return stores = stores.filter(function(task){
        return task.closeTime && (now - task.closeTime < Task.GC_TIME);
    });
};

'sh git'.split(' ').forEach(function(method){
    Task[method] = function(options, quiet){
        options.cmd = method;

        if(typeof options.args == 'string'){
            options.args = options.args.split(/\s+/g);
        }

        return Task(options, quiet);
    }
});