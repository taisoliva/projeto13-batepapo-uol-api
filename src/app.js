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

console.log(Date.now())

const mongoClient = new MongoClient(process.env.DATABASE_URL)
mongoClient.connect()
    .then(() => {
        db = mongoClient.db(); 
        })
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
    const { user } = req.headers
    const isParticipant = await db.collection("participants").findOne({ name: user })
        if (isParticipant === null) return res.status(422).send("Este usuário saiu")
    const time = dayjs().format("HH:mm:ss")
    const newMessage = { from: user, to: to, text: text, type: type, time: time }

    const userSchema = joi.object({
        to:joi.string().required(),
        text: joi.string().required(), 
        type: joi.string().valid('message', 'private_message').required(),
        from: joi.string().required()
    }).unknown(true)

    const validation = userSchema.validate(newMessage)

    if (validation.error) {
        const erros = validation.error.details.map(detail => detail.message)
        return res.status(422).send(erros)
    }

    /* if (to === "" || text === "") {
        return res.status(422).send("Campo obrigatório")
    }

    if (type !== "message" && type !== "private_message") {
        return res.sendStatus(422)
    }
 */
    try {
       
       /*  const isParticipant = await db.collection("participants").findOne({ name: user })
        if (isParticipant === null) return res.status(422).send("Este usuário saiu") */
      
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

async function remover (){

    try{
        const offline = await db.collection("participants").find({ 
            lastStatus: { $lt: Date.now() - 10000}
            /* $where: function () { return (Date.now() - this.lastStatus) > 10000 } */
        }).toArray()

        offline.forEach( async ({name}) => {
            const msg = {
                from: name,
                to: "Todos",
                text: "sai da sala...",
                type: "status",
                time: dayjs().format("HH:mm:ss")
            }
            try{
                await db.collection("participants").deleteOne({name}) 
                await db.collection("messages").insertOne(msg)
            } catch (err) {
                console.log(err.message)
            }
        })


    } catch (error){
        res.send(error)
    }
}

function verifica (){
    setInterval(()=> {
        remover()
    }, 15000)
}

verifica()


app.listen(PORT, () => {
    console.log(`Server is running to ${PORT} port`)
})