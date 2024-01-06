


let RoomDB = {}
let ChatDB = {}
let UserDB = {0:'Server'}
let RoomID_To_ChatID = {}
let Authorization_Keys_For_Rooms = {}
let Session_Keys_For_Rooms = {}

const express = require('express')
const server = express()    
server.listen(80)
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
            res.send(String(NewSessionID))
        }
    }
})

