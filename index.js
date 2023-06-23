const express = require('express')
const app = express()
const cors = require('cors')
const mongoose=require('mongoose')
const ObjectId = mongoose.Types.ObjectId;
require('dotenv').config()
app.use(express.urlencoded({extended: false})); // 解析 application/x-www-form-urlencoded 类型的请求体数据
app.use(express.json());
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
//連接資料庫
let db = mongoose.connect(process.env.db, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    // 连接成功后的操作
    console.log('成功連接到mongodb');
  })
  .catch((error) => {
    // 连接失败后的操作
    console.error('未能連接到mongodb :', error);
  });
//建立架構
const schema = new mongoose.Schema({
  username: String,
  count: { type: Number, default: 0 },
  log: [{
    description: {type:String,required:true},
    duration: {type:Number,required:true},
    date: Date
  }]
});
 
//建立collection
const exercise = mongoose.model('Exercise',schema);

//取得用戶名
app.post('/api/users',(req,res)=>{
  var username=req.body.username
  exercise.findOne({username:username}).then((data)=>{
    if(data){}
    else{
      let newuser = new exercise({username: username});
      newuser.save().then((done)=>{
        if(done)console.log("save data success")
        else console.log('save data fail')
      })
      .catch((err)=>{
        res.send(err)
      })
    }
  })
  .then(()=>{
    exercise.findOne({username:username}).then((data)=>{
      res.json({username:data.username,_id:data._id})
    })
    .catch((err)=>{
      res.json(err)
    })
  })
})
//get user list
app.get('/api/users',(req,res)=>{
  exercise.find({}).select('username _id').then((data)=>{
      res.send(data)
    })
    .catch((err)=>{
      res.json(err)
    })
})
//增加運動類型或數量
app.post('/api/users/:_id/exercises',(req,res)=>{
  var id=req.body[':_id']
  var log=[],username
  var description=req.body.description
  var duration=+req.body.duration
  if(req.body.date=='')var date=new Date(new Date().toDateString())
  else var date=(new Date(req.body.date))
  console.log(id,description,duration,date)
  exercise.findOne({_id:id}).then((data)=>{
    console.log(data)
    log=data.log
    console.log(log)
    log=({description:description,
                 duration:duration,
                 date:date})
      username=data.username
      console.log(username)
    
    exercise.findOneAndUpdate({_id:id},{$inc:{count:1},
            $push:{log:log}},{new:true}).then((done)=>{
    console.log(done)
    res.json({_id:id,username:username,date:date.toDateString(),duration:duration,
            description:description})
    })
      .catch((err)=>{
        res.send('update data fail')
        console.log(err)})
    })
    .catch((error)=>{
      res.send('cant find the username')
      console.log(error)
    })
})
//查詢log
app.get('/api/users/:_id/logs',(req,res)=>{
  var id=req.params._id
  var from=req.query.from || "Sat Jan 01 1900"
  var to=req.query.to || new Date().toDateString()
  var limit=req.query.limit || 100000
  console.log(id,from,to,limit)
  exercise.aggregate([
  {$match:{_id:new ObjectId(id)}},
  {$unwind: "$log"},
  {$match: {
      "log.date": {
        $gte: new Date(from),
        $lte: new Date(to)
  }}},
  {$group:{_id:"$_id", // 根据 _id 分组，可以根据需要更改分组字段
          username: { $first: "$username" }, // 保留 username 字段
          log: { $push: "$log" },
  }},
  {$project: {
      _id: 1,
      username: 1,
      log: { $slice: ["$log",0, parseInt(limit)] } // 限制 log 数组字段的元素数量并保存到 limitedLog 字段
  }}
  ])
  .then((data)=>{
    console.log(data)
    data=data[0]
    res.json({"_id":data._id,"username":data.username,"count":data.log.length,
          "log": data.log.map((logItem) => ({
          "description": logItem.description,
          "duration": logItem.duration,
          "date": (logItem.date).toDateString()}))
      })
  })
  .catch((err)=>{
    console.log(err)
    res.send(err)  
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
