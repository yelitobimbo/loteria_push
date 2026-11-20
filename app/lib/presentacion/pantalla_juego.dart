import 'package:flutter/material.dart';

import '../dominio/cartas.dart';
import '../dominio/lineas.dart';
import '../dominio/partida.dart';
import 'vms.dart';

class PantallaJuego extends StatelessWidget {
  const PantallaJuego({super.key, required this.vm});
  final JuegoVm vm;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: vm,
      builder: (context, _) {
        final p = vm.partida;
        if (p == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));
        return Scaffold(
          appBar: AppBar(
            title: Text('Sala ${p.sala}'),
            actions: [IconButton(tooltip: 'Salir', icon: const Icon(Icons.logout), onPressed: vm.salir)],
          ),
          // SingleChildScrollView + Column: construye todo (ListView no construye lo que queda fuera de pantalla).
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (!vm.avisosActivos)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(8),
                  child: Text('Sin avisos: la app revisa al cantor cada 5 s mientras esté abierta.'),
                ),
              ),
            _CartaActual(partida: p),
            const SizedBox(height: 8),
            GridView.count(
              crossAxisCount: 4,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 6,
              crossAxisSpacing: 6,
              childAspectRatio: 0.8,
              children: [for (final id in p.tabla) _Casilla(id: id, marcada: p.estaMarcada(id))],
            ),
            const SizedBox(height: 12),
            if (p.ganador != null)
              Card(
                color: Colors.amber.shade100,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    '🎉 ${p.ganador} ganó con ${describirPatron(p.patronGanador ?? '')}',
                    textAlign: TextAlign.center,
                  ),
                ),
              )
            else if (p.casi)
              const Card(child: Padding(padding: EdgeInsets.all(8), child: Text('😮 ¡Estás a UNA carta de ganar!', textAlign: TextAlign.center))),
            FilledButton(
              onPressed: p.puedeCantarLoteria ? vm.cantarLoteria : null,
              child: const Text('¡LOTERÍA!'),
            ),
            if (vm.mensaje != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(vm.mensaje!, textAlign: TextAlign.center)),
            if (vm.controlador.ultimoError != null)
              Padding(padding: const EdgeInsets.only(top: 8), child: Text(vm.controlador.ultimoError!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center)),
            ]),
          ),
        );
      },
    );
  }
}

class _CartaActual extends StatelessWidget {
  const _CartaActual({required this.partida});
  final Partida partida;

  @override
  Widget build(BuildContext context) {
    final c = partida.ultimaCarta;
    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: c == null
            ? const Text('Esperando la primera carta...', textAlign: TextAlign.center)
            : Column(children: [
                Text('#${c.n} · ${c.nombre}', style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
                const SizedBox(height: 4),
                Text(c.pista, textAlign: TextAlign.center),
              ]),
      ),
    );
  }
}

class _Casilla extends StatelessWidget {
  const _Casilla({required this.id, required this.marcada});
  final int id;
  final bool marcada;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: marcada ? Colors.green.shade200 : Colors.orange.shade50,
        border: Border.all(color: marcada ? Colors.green : Colors.orange.shade200, width: 2),
        borderRadius: BorderRadius.circular(8),
      ),
      padding: const EdgeInsets.all(4),
      alignment: Alignment.center,
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(nombreDeCarta(id), textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        if (marcada) const Text('🫘', style: TextStyle(fontSize: 20)), // el frijol de la lotería
      ]),
    );
  }
}
