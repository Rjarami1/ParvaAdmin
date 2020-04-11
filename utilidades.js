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

function dateTimeClock()
{
        date = new Date;
        year = date.getFullYear();
        month = date.getMonth();
        months = new Array('Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre');
        d = date.getDate();
        day = date.getDay();
        days = new Array('Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado');
        h = date.getHours();
        if(h<10)
        {
                h = "0"+h;
        }
        m = date.getMinutes();
        if(m<10)
        {
                m = "0"+m;
        }
        s = date.getSeconds();
        if(s<10)
        {
                s = "0"+s;
        }
        result = ''+days[day]+' '+months[month]+' '+d+' '+year+' '+h+':'+m+':'+s;
        return result;
}