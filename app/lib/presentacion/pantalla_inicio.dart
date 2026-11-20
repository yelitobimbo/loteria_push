import 'package:flutter/material.dart';

import '../dominio/puerto_push.dart';
import 'pantalla_cantor.dart';
import 'vms.dart';

class PantallaInicio extends StatefulWidget {
  const PantallaInicio({super.key, required this.vm, required this.crearCantor});
  final JuegoVm vm;
  final CantorVm Function() crearCantor;

  @override
  State<PantallaInicio> createState() => _PantallaInicioState();
}

class _PantallaInicioState extends State<PantallaInicio> {
  final _nombre = TextEditingController();
  final _sala = TextEditingController();

  @override
  void dispose() {
    _nombre.dispose();
    _sala.dispose();
    super.dispose();
  }

  /// Pre-permiso: explicamos el valor ANTES de que salga el diálogo del sistema.
  Future<bool> _preguntarPorAvisos() async {
    if (widget.vm.permiso != PermisoPush.sinPreguntar) return false; // ya decidió: no insistimos
    final r = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('¿Quieres que el cantor te avise?'),
        content: const Text(
            'Te avisaremos cuando se cante una carta y cuando estés a UNA de ganar, aunque tengas la app cerrada. '
            'Si prefieres no recibir avisos, igual puedes jugar: la app revisará cada pocos segundos mientras esté abierta.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Mejor no')),
          FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Sí, avísame')),
        ],
      ),
    );
    return r ?? false;
  }

  Future<void> _unirse() async {
    final nombre = _nombre.text.trim();
    final sala = _sala.text.trim();
    if (nombre.isEmpty || sala.isEmpty) return;
    final pedir = await _preguntarPorAvisos();
    if (!mounted) return;
    await widget.vm.unirse(sala: sala, nombre: nombre, pedirAvisos: pedir);
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.vm,
      builder: (context, _) => Scaffold(
        appBar: AppBar(title: const Text('🐓 Lotería Push')),
        body: ListView(padding: const EdgeInsets.all(16), children: [
          const Text('El cantor canta las cartas por notificación push. ¡Llena una línea y grita Lotería!',
              textAlign: TextAlign.center),
          const SizedBox(height: 16),
          TextField(controller: _nombre, maxLength: 20, decoration: const InputDecoration(labelText: 'Tu nombre')),
          TextField(
            controller: _sala,
            textCapitalization: TextCapitalization.characters,
            maxLength: 8,
            decoration: const InputDecoration(labelText: 'Código de sala'),
          ),
          if (widget.vm.mensaje != null)
            Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Text(widget.vm.mensaje!, style: const TextStyle(color: Colors.red))),
          FilledButton(onPressed: widget.vm.ocupado ? null : _unirse, child: const Text('Unirme a la sala')),
          const SizedBox(height: 24),
          OutlinedButton(
            onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(
              builder: (_) => PantallaCantor(vm: widget.crearCantor()),
            )),
            child: const Text('Soy el cantor: crear una sala'),
          ),
        ]),
      ),
    );
  }
}
