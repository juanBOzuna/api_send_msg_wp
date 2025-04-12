const {Client,LocalAuth} = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')

const client = new Client({
    authStrategy: new LocalAuth()

})

client.on('qr',(qr)=>{
    qrcode.generate(qr,{small:true})
    console.log('Escanea el codigo')
})


client.on('ready',()=>{
    console.log('READY!')
})

client.on('message',message=>{
    console.log('new');
    if(message.body==='hola'){
        message.reply('hola')
    }
})

client.initialize();