//Inicializa un objeto de fecha
function todayDate() {
    var today = new Date()

    //Si el día es de un solo dígito se antepone un cero (Para seguir el formato de fecha)
    var day = today.getDate().toString()
    if (day.length < 2) {
        day = `0${day}`
    }
    // cambiar definición de variables a let
    //Si el mes es de un solo digito se antepone un cero (Para seguir el formato de fecha)
    var month = today.getMonth() + 1
    month = month.toString()
    if (month.length < 2) {
        month = `0${month}`
    }

    //Se asigna la fecha al campo de fecha en el formulario para generar la fecha
    //de hoy automáticamente
    var auto_date = today.getFullYear() + '-' + month + '-' + day

    return auto_date
}