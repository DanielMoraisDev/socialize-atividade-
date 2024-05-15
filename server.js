import fs from "node:fs"
import http from "node:http"
import formidable from "formidable"
import { type } from "node:os"

const locationDataBase = "./users.json"
const PORT = 8081 || 3333

http.createServer((req, res) => {
    const { method, url } = req

    const protocolResponse = (status) => {
        return res.writeHead(status, { "Content-Type": "application/json" })
    }

    const messageResponse = (messageText) => {
        return res.end(JSON.stringify({ message: messageText }))
    }

    fs.readFile(locationDataBase, "utf-8", (err, data) => {
        if (err) {
            protocolResponse(500)
            messageResponse("Não foi possivel ler os dados do banco de dados: " + locationDataBase + ", error: " + err)
            return
        }

        let jsonData = []
        try {
            jsonData = JSON.parse(data)
        } catch (error) {
            console.log("Erro ao extrair as informações do: " + locationDataBase + ", error: " + error)
        }

        const jsonBodyReceive = (func, urlID) => {
            let body = ""
            req.on('data', (chunk) => body += chunk.toString())
            req.on('end', () => {
                return func(body, urlID)
            })
        }

        const addInFile = (data, protocol) => {
            protocol = 201 || protocol
            fs.writeFile(locationDataBase, JSON.stringify(jsonData, null, 2), (err) => {
                if (err) {
                    protocolResponse(500)
                    messageResponse("Não foi possivel inserir os dados")
                }

                protocolResponse(protocol)
                messageResponse(data)
            })
        }

        const getDate = () => {
            const dateBase = new Date();
            const date = dateBase.getDate();
            const month = dateBase.getMonth();
            const year = dateBase.getFullYear();
            const hours = dateBase.getHours();
            const minutes = dateBase.getMinutes();
            const seconds = dateBase.getSeconds();
            return year + "-" + month + "-" + date + "." + hours + ":" + minutes + ":" + seconds;
        };

        const verifyUserRegister = (email) => {
            return jsonData.find(e => e.email == email)
        }

        const createUser = (data) => {
            let newUser = JSON.parse(data)
            const verifyUser = verifyUserRegister(newUser.email)
            if (verifyUser == undefined) {
                newUser.perfil.date = getDate()
                newUser.perfil.bio = null
                newUser.perfil.imageProfile = null
                const id = newUser.id = String(jsonData.length + 1)
                delete newUser.id
                newUser = { id, ...newUser }
                if (newUser.id && newUser.nome && newUser.perfil.nomePerfil && newUser.perfil.email && newUser.senha) {
                    jsonData.push(newUser)
                    addInFile(newUser)
                } else {
                    protocolResponse(500)
                    messageResponse("Preencha todos os dados corretamente")
                }
            } else {
                protocolResponse(500)
                messageResponse("Este email já está sendo usado")
            }
        }

        const userLogin = (data) => {
            const userInfo = JSON.parse(data)
            const verifyEmail = jsonData.find(e => e.email == userInfo.email)
            if (verifyEmail) {
                const userForLogin = jsonData.filter(e => e.email == userInfo.email)
                const verifyPassword = userForLogin.find(e => e.senha == userInfo.senha)
                if (verifyPassword) {
                    protocolResponse(200)
                    messageResponse("Você será redirecionado!")
                } else {
                    protocolResponse(500)
                    messageResponse("Senha incorreta")
                }
            } else {
                protocolResponse(500)
                messageResponse("Email não encontrado")
            }
        }

        const getUserProfile = (urlID) => {
            const index = jsonData.findIndex(e => e.id == urlID)
            if (index !== -1) {
                protocolResponse(200)
                messageResponse(jsonData[index])
            } else {
                protocolResponse(500)
                messageResponse("Index inválido")
            }
        }

        const updateUserProfile = (data, urlID) => {
            const index = jsonData.findIndex(e => e.id == urlID)
            if (index !== -1) {
                const updatedUser = JSON.parse(data)
                if (!data.id) {
                    updatedUser.perfil.lastUpdate = getDate()
                    jsonData[index] = { ...jsonData[index], ...updatedUser }
                    addInFile(jsonData)
                    protocolResponse(200)
                    messageResponse(jsonData[index])
                } else {
                    protocolResponse(500)
                    messageResponse("Você não pode atualizar o id")
                }
            } else {
                protocolResponse(500)
                messageResponse("Index inválido")
            }
        }
        
        const getBinaryImg = async (urlID) => {
            const form = formidable({})

            let fields;
    
            try {
                [fields] = await form.parse(req)
                updateUserImage(fields, urlID)
            } catch (err) {
                res.writeHead(500, { "Content-Type": "application/json" })
                res.end(JSON.stringify({ message: "Error ao enviar os dados" }))
                return
            }
    
            fs.rename(fields.file[0].filepath, `img/${fields.file[0].newFilename}.png`, (err) => {
                if (err) {
                    res.writeHead(500, { "Content-Type": "application/json" })
                    res.end(JSON.stringify({ message: "Error ao enviar os dados" }))
                    return
                }
            })
            return 
        }

        const updateUserImage = (imageJson, urlID) => {
            const index = jsonData.findIndex(e => e.id == urlID)
            if (index !== -1) {

                console.log(imageJson.file)
                // jsonData[index] = { ...jsonData[index].perfil }
                addInFile(jsonData)
                protocolResponse(200)
                messageResponse(jsonData[index])
            } else {
                protocolResponse(500)
                messageResponse("Index inválido")
            }
        }

        if (method === "GET" && url === "/usuarios") {
            if (jsonData.length > 0) {
                protocolResponse(200)
                messageResponse(jsonData)
            } else {
                protocolResponse(500)
                messageResponse("Não há usuários registados")
            }
        } else if (method === "POST" && url === "/usuarios") {
            jsonBodyReceive(createUser)
        } else if (method === "POST" && url === "/login") {
            jsonBodyReceive(userLogin)
       } else if (method === "GET" && url.startsWith("/perfil/")) {
            const urlID = url.split("/")[2]
            getUserProfile(urlID)
        } else if (method === "PUT" && url.startsWith("/perfil/")) {
            const urlID = url.split("/")[2]
            jsonBodyReceive(updateUserProfile, urlID)
        } if (method === "POST" && url.startsWith("/perfil/imagem/")) {
            const urlID = url.split("/")[3]
            getBinaryImg(urlID)
        } else {
            protocolResponse(500)
            messageResponse("Essa rota não existe")
        }
    })
}).listen(PORT, () => console.log("http://localhost:" + PORT))