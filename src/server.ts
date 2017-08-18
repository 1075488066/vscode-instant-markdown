import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
interface ServerOption {
    root: string;
    started: () => void
}
export default  class Server {
    io:any;
    http:any;
    sockets: any;

    constructor(options:ServerOption) {
        const app = require('express')();
        const http = require('http').Server(app);
        const io = require('socket.io')(http);

        app.get('/', function(req, res){
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'no-store');
            res.sendfile(path.resolve(__dirname, '..', '..', 'index.html'));
        });

        app.get('/github-markdown.css', function(req,res) {
            res.sendfile(path.resolve(__dirname , '..','..','node_modules','github-markdown-css','github-markdown.css'))
        })

        app.get('/github-highlight.css', function(req,res) {
            res.sendfile(path.resolve(__dirname , '..','..','node_modules','highlight.js','styles', 'github.css'))
        })

        app.get('*', function(req,res) {
            let file = path.resolve(path.join(options.root, req.url));
            if (fs.existsSync(file)) {
                res.sendFile(file)
            } else {
                res.status(404).send("Not Found")
            }
        })

        this.sockets = {};
        var nextSocketId = 0;
        http.on('connection', (socket) => {
            var socketId = nextSocketId++;
            this.sockets[socketId] = socket;
            socket.on('close',  () => { delete this.sockets[socketId]; });
        });

        var port = vscode.workspace.getConfiguration("instantmarkdown").get("port");
        http.listen(port, function(){
            console.log('listening on *:' + port);
            options.started()
        });

        this.io = io;
        this.http = http;
    }
    send(markdown:string) {
       this.io.emit('markdown', markdown)
    }
    close() {
        this.io.close()
        for (var socketId in this.sockets) {
            console.log('socket', socketId, 'destroyed');
            this.sockets[socketId].destroy();
        }
        this.http.close(function() {;
            console.log("stopped")
        });
    }
}