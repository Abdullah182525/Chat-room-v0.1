


let RoomDB = {}
let ChatDB = {}
let UserDB = {0:'Server'}
let RoomID_To_ChatID = {}
let Authorization_Keys_For_Rooms = {}
let Session_Keys_For_Rooms = {}

const http = require('http')
const WebSocket = require('ws')
const express = require('express')
const server = express()    
server.use(express.json())
server.use(express.urlencoded({extended:true}))

server.get('',function(req,res){
    res.sendFile(__dirname + '/frontend/index.html')
})

server.get('/room/:RoomID',function(req,res){
    if(req.headers.cookie != undefined){
        let cookies = req.headers.cookie.split(';').map(item => item.split('=')).reduce((acc, [k, v]) => (acc[k.trim().replace('"', '')] = v) && acc, {});
        if(cookies['_authroom']){
            let authkey = Number(cookies['_authroom'])
            if(Authorization_Keys_For_Rooms[authkey]){
                let AuthInfo = Authorization_Keys_For_Rooms[authkey]
                let RoomID = Number(AuthInfo['RoomID'])
                let UserID = Number(AuthInfo['UserID'])
                if(req.params.RoomID == RoomID){
                    res.sendFile(__dirname + '/frontend/room.html')
                }
            }
        }
    }
})

server.post('/API/Rooms/Request-Room-Enter',function(req,res){
    let RequestParams = JSON.parse(JSON.stringify(req.body))
    console.log(RequestParams)
    let RoomID = Number(RequestParams['RoomID'])
    let Name = RequestParams['Name']
    if(RoomID && Name){
        if(RoomDB[RoomID]){
            let UserID = Math.floor((Math.random() * 10000) + 1)
            UserDB[UserID] = Name
            let AuthorizationKey = Math.floor((Math.random() * 10000) + 1)
            Authorization_Keys_For_Rooms[AuthorizationKey] = {'RoomID':RoomID,'UserID':UserID} 
            res.send(String(AuthorizationKey))
        }else{
            let ChatID = Math.floor((Math.random() * 10000) + 1)
            RoomDB[RoomID] = {0:true}
            ChatDB[ChatID] = [{UserID:0,Message:'Welcome to chat room!'}]
            RoomID_To_ChatID[RoomID] = ChatID
            let UserID = Math.floor((Math.random() * 10000) + 1)
            UserDB[UserID] = Name
            let AuthorizationKey = Math.floor((Math.random() * 10000) + 1)
            Authorization_Keys_For_Rooms[AuthorizationKey] = {'RoomID':RoomID,'UserID':UserID}
            res.send(String(AuthorizationKey))
        }
    }
})

server.post('/API/Rooms/Request-SessionID',function(req,res){
    let RequestParams = JSON.parse(JSON.stringify(req.body))
    if(RequestParams['AuthKey']){
        let AuthKey = RequestParams['AuthKey']
        if(Authorization_Keys_For_Rooms[AuthKey]){
            let AuthInfo = Authorization_Keys_For_Rooms[AuthKey]
            let RoomID = AuthInfo['RoomID']
            let UserID = AuthInfo['UserID']
            let NewSessionID = Math.floor((Math.random() * 10000) + 1)
            Session_Keys_For_Rooms[NewSessionID] = {'RoomID':RoomID,'UserID':UserID}
            res.cookie('_SessionKey',NewSessionID)
            res.send(true)
        }
    }
})

const httpserver = http.createServer(server).listen(80)

let MessagesWebSocket = new WebSocket.Server({server:httpserver})
let MessagesWebSocketClients = new Map()

function BroadcastNewMessage(ChatID,RoomID){
    MessagesWebSocketClients.forEach(function(v,k){
        let valueRoomID = v['RoomID']
        if(valueRoomID == RoomID){
            let Chat = ChatDB[ChatID]
            let ClientChat = []
            for(let x = 0;x<Chat.length;x++){
                let Chatindex = Chat[x]
                ClientChat.push({UserID:UserDB[Chatindex['UserID']],Message:Chatindex['Message']})
            }
            k.send(JSON.stringify(ClientChat))
        }
    })
}

function SingleCastMessage(ws,ChatID,RoomID){
    let Chat = ChatDB[ChatID]
    let ClientChat = []
    for(let x = 0;x<Chat.length;x++){
        let Chatindex = Chat[x]
        ClientChat.push({UserID:UserDB[Chatindex['UserID']],Message:Chatindex['Message']})
    }
    ws.send(JSON.stringify(ClientChat))
}

MessagesWebSocket.on('connection',function(ws,req){
    if(req.url == '/rooms/messages-ws'){
        if(req.headers.cookie != undefined){
            let cookies = req.headers.cookie.split(';').map(item => item.split('=')).reduce((acc, [k, v]) => (acc[k.trim().replace('"', '')] = v) && acc, {});
            if(cookies['_SessionKey']){
                let SessionKey = Number(cookies['_SessionKey'])
                if(Session_Keys_For_Rooms[SessionKey]){
                    let SessionInfo = Session_Keys_For_Rooms[SessionKey]
                    let RoomID = SessionInfo['RoomID']
                    let UserID = SessionInfo['UserID']
                    MessagesWebSocketClients.set(ws,{'UserID':UserID,'RoomID':RoomID})
                    let ChatID = RoomID_To_ChatID[RoomID]
                    SingleCastMessage(ws,ChatID,RoomID)
                }else{
                    ws.close()
                    console.log('hey4')
                }
            }else{
                ws.close()
                console.log('hey3')
            }
        }else{
            ws.close()
            console.log('hey2')
        }
    }else{
        ws.close()
        console.log('hey')
    }
    ws.on('message',function(data){
        data = data.toString()
        let Info = MessagesWebSocketClients.get(ws)
        let RoomID = Number(Info['RoomID'])
        let UserID = Number(Info['UserID'])
        let UserName = UserDB[UserID]
        let ChatID = RoomID_To_ChatID[RoomID]
        let Chat = ChatDB[ChatID]
        console.log(Chat)
        Chat.push({'UserID':UserID,'Message':data})
        console.log(Chat)
        ChatDB[ChatID] = Chat
        BroadcastNewMessage(ChatID,RoomID)
    })
});