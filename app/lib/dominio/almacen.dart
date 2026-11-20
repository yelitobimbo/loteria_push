/// Persistencia mínima (clave-valor). En la app real usa SharedPreferences.
abstract class Almacen {
  Future<String?> leerTexto(String clave);
  Future<void> guardarTexto(String clave, String valor);
  Future<void> borrar(String clave);
}

class AlmacenMemoria implements Almacen {
  final Map<String, String> _datos = {};

  @override
  Future<String?> leerTexto(String clave) async => _datos[clave];
  @override
  Future<void> guardarTexto(String clave, String valor) async => _datos[clave] = valor;
  @override
  Future<void> borrar(String clave) async => _datos.remove(clave);
}
