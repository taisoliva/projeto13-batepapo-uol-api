import express from "express"
import cors from "cors"
import mongodb from 'mongodb';
import dotenv from "dotenv"
import dayjs from "dayjs"
import joi from "joi"

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

    const newParticipant = { name: name, lastStatus: Date.now() }

    const userSchema = joi.object({
        name: joi.string().required(),
        lastStatus: joi.number()
    })

    const validation = userSchema.validate(newParticipant)

    if (validation.error) {
        const erros = validation.error.details.map(detail => detail.message)
        return res.status(422).send(erros)
    }

    try {
        const isParticipant = await db.collection("participants").findOne({ name: name })
        if (isParticipant !== null) return res.status(409).send("Este nome já esta sendo usado")


        const time = dayjs().format("HH:mm:ss")
        const newMessage = { from: name, to: "Todos", text: "entra na sala...", type: "status", time: time }


        await db.collection("participants").insertOne(newParticipant)
        await db.collection("messages").insertOne(newMessage)

        /* let intervalo = setInterval(async () => {
            const array = await db.collection("participants").find({
                lastStatus: { $gt: 10000 },
                $where: function () { return (Date.now() - this.lastStatus) > 10000 }
            }).toArray()

            const messages = await db.collection("messages").find({ type: "status" }).toArray()

            for (let i = 0; i < messages.length; i++) {
                for (let j = 0; j < array.length; j++) {

                    if (array[j].name === messages[i].from) {
                        await db.collection("messages").insertOne({
                            from: array[j].name,
                            to: messages[i].to,
                            text: "sai da sala...",
                            type: messages[i].type,
                            time: dayjs().format("HH:mm:ss")
                        })
                    }

                    await db.collection("participants").deleteOne({ name: array[j].name })

                    /* await db.collection("messages")
                        .updateOne({ from: array[j].name },
                            { $set: { text: "sai da sala..." } })
                    
                    await db.collection("participants").deleteOne({name:array[j].name}) 
                }
                await db.collection("messages").deleteOne({ from: messages[i].from })
            }
        }, 15000) */

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

    console.log({ to, text, type })

    /* if (to === "" || text === "") {
        return res.status(422).send("Campo obrigatório")
    }

    if (type !== "message" && type !== "private_message") {
        return res.sendStatus(422)
    }
 */
    try {
        const { user } = req.headers

        console.log("pegando o header", user)

        const isParticipant = await db.collection("participants").findOne({ name: user })
        if (isParticipant === null) return res.status(422).send("Este usuário saiu")

        const time = dayjs().format("HH:mm:ss")
        const newMessage = { from: user, to: to, text: text, type: type, time: time }

        await db.collection("messages").insertOne(newMessage)

        return res.sendStatus(201)

    } catch (err) {
        return res.status(500).send(err.message)
    }

})

app.get("/messages", async (req, res) => {

    const limit = req.query.limit
    const { user } = req.headers
    const array = []

    try {
        const messages = await db.collection("messages").find().toArray()

        let resp = await db.collection("messages").find({
            $or: [
                { to: "Todos" },
                { to: user },
                { from: user }]
        }).toArray()

        if (parseInt(limit) > 0) {
            resp = resp.slice(-limit)

            for (let i = 0; i < resp.length; i++) {
                if (resp[i]) array.push(resp[i])
            }

            return res.send(array)

        } else if (parseInt(limit) <= 0 || (isNaN(limit) && limit !== "")) {
            return res.sendStatus(422)

        } else {
            return res.send(resp)
        }
    } catch (err) {
        return res.send(err.message)
    }

})

app.post("/status", async (req, res) => {

    const { user } = req.headers


    if (user === "") return res.sendStatus(404)

    try {
        const resp = await db.collection("participants").findOne({ name: user })
        if (!resp) return res.sendStatus(404)
        await db.collection("participants")
            .updateOne({ name: user }, { $set: { lastStatus: Date.now() } })
        res.sendStatus(200)

    } catch (err) {
        res.send(err.message)
    }


})


app.listen(PORT, () => {
    console.log(`Server is running to ${PORT} port`)
})