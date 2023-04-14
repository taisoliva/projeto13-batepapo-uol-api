import express from "express"
import cors from "cors"
import mongodb from 'mongodb';
import dotenv from "dotenv"
import dayjs from "dayjs"

const app = express()
const PORT = 5000;
const { MongoClient } = mongodb;


app.use(express.json())
app.use(cors())
dotenv.config()


let db

const mongoClient = new MongoClient(process.env.DATABASE_URL)
mongoClient.connect()
    .then(() => db = mongoClient.db())
    .catch((err) => console.log(err.message))

app.post("/participants", async (req, res) => {

    const { name } = req.body


    if (!name) {
        return res.status(422).send("Todos os campos são obrigatórios!")
    }

    try {
        const isParticipant = await db.collection("participants").findOne({ name: name })
        if (isParticipant !== null) return res.status(409).send("Este nome já esta sendo usado")


        const time = dayjs().format("HH:mm:ss")
        const newParticipant = { name: name, lastStatus: Date.now() }
        const newMessage = { from: name, to: "Todos", text: "entra na sala...", type: "status", time: time }


         await db.collection("participants").insertOne(newParticipant)
         await db.collection("messages").insertOne(newMessage)
       

        return res.status(201).send("Participante adicionado!")

    } catch (err) {
        return res.status(500).send(err.message)
    }



})





app.get("/participants", (req, res) => {

})

app.post("/messages", (req, res) => {

})

app.get("/messages", (req, res) => {

})

app.post("/status", (req, res) => {

})

app.listen(PORT, () => {
    console.log(`Server is running to ${PORT} port`)
})