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

app.get("/participants", async (req, res) => {

    try {
        const participants = await db.collection("participants").find().toArray()
        res.send(participants)
    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }

})

app.post("/messages", async (req, res) => {


    const { to, text, type } = req.body

    if (to === "" || text === "") {
        return res.status(422).send("Campo obrigatório")
    }

    if (type !== "message" && type !== "private_message") {
        console.log("to aqi")
        return res.sendStatus(422)
    }

    try {
        const { from } = req.headers

        console.log(from)

        const isParticipant = await db.collection("participants").findOne({ name: from })
        if (isParticipant === null) return res.status(422).send("Este usuário saiu")

        const time = dayjs().format("HH:mm:ss")
        const newMessage = { from: from, to: to, text: text, type: type, time: time }

        await db.collection("messages").insertOne(newMessage)

        return res.sendStatus(201)

    } catch (err) {
        return res.status(500).send(err.message)
    }



    res.sendStatus(201)


})

app.get("/messages", async (req, res) => {

    const limit = req.query.limit
    const { user } = req.headers
    const array = []

    console.log(parseInt(limit) <= 0)

    try {
        const messages = await db.collection("messages").find().toArray()

        const resp = await db.collection("messages").find({
            $or: [
                { to: "Todos" },
                { to: user },
                { from: user }]
        }).toArray()

        if (parseInt(limit) > 0) {
            for (let i = 0; i < limit; i++) {
                if (resp[i]) array.push(resp[i])
            }

            return res.send(array)

        } else if (parseInt(limit) <= 0 || (isNaN(limit) && limit !== "")) {
            console.log("entrei")
            return res.sendStatus(422)

        } else {
            return res.send(resp)
        }
    } catch (err) {
        return res.send(err.message)
    }

})

app.post("/status", (req, res) => {

})

app.listen(PORT, () => {
    console.log(`Server is running to ${PORT} port`)
})