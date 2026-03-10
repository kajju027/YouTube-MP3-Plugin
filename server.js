const express = require("express")
const yts = require("yt-search")
const ytdl = require("ytdl-core")

const app = express()

app.get("/", (req,res)=>{
res.json({
name:"Sayan Music API",
status:"running"
})
})

app.get("/music", async (req,res)=>{

const query = req.query.song

if(!query){
return res.json({
status:false,
message:"Please provide song name"
})
}

try{

const search = await yts(query)
const video = search.videos[0]

if(!video){
return res.json({
status:false,
message:"Song not found"
})
}

res.json({
status:true,
result:{
title:video.title,
duration:video.timestamp,
views:video.views,
thumbnail:video.thumbnail,
download_url:`/audio?id=${video.videoId}`
}
})

}catch(e){

res.json({
status:false,
message:"API error"
})

}

})

app.get("/audio",(req,res)=>{

const id = req.query.id

if(!id){
return res.send("No video id")
}

const url = `https://youtube.com/watch?v=${id}`

res.setHeader("Content-Type","audio/mpeg")

ytdl(url,{
filter:"audioonly",
quality:"highestaudio"
}).pipe(res)

})

const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{
console.log("Server running")
})
