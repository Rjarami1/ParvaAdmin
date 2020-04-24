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

//Función que entrega la fecha y hora actuales del sistema y la genera en formato Día/Mes/Año h:m:s
function dateTimeClock() {
        date = new Date;
        year = date.getFullYear();
        month = date.getMonth();
        months = new Array('Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre');
        d = date.getDate();
        day = date.getDay();
        days = new Array('Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado');
        h = date.getHours();
        if (h < 10) {
                h = "0" + h;
        }
        m = date.getMinutes();
        if (m < 10) {
                m = "0" + m;
        }
        s = date.getSeconds();
        if (s < 10) {
                s = "0" + s;
        }
        result = '' + days[day] + ' ' + months[month] + ' ' + d + ' ' + year + ' ' + h + ':' + m + ':' + s;
        return result;
}

//Función para darle formato monetario igual al de PostgreSQL a un número. Funciona máximo hasta el número
//999.999.999. Dudo que lleguen a vender mil millones de pesos en pandebonos...
function formatCurrency(num) {
        let number = num.toString();

        let hundr = '', thous = '', mill = '';
        let len = number.length;

        if (typeof num != 'number') {
                len = 0;
        }

        if (len > 0) {
                if (number.length >= 7) {
                        mill = number.slice(0, len - 6);
                        mill += ','
                }
                if (number.length >= 4) {
                        if (mill.length > 0) {
                                thous = number.slice(len - 6, len - 3);
                        }
                        else {
                                thous = number.slice(0, len - 3);
                        }
                        thous += ',';
                }
                if (thous.length > 0) {
                        hundr = number.slice(len - 3);
                }
                else {
                        hundr = number;
                }

                return '$' + mill + thous + hundr + '.00';
        }
        else {
                return '$0.00'
        }

}