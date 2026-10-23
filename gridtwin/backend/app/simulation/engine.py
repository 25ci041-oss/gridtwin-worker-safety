"""GRIDTWIN Backend - Graph-Based Network Simulation Engine

This module implements the core simulation logic:
- Stage A: Connectivity simulation (mandatory)
- Stage B: Educational electrical calculations
- Stage C: Adapter interface for advanced solvers

The simulation operates on a graph representation of the distribution network.
"""
import uuid
import math
import networkx as nx
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class SimNode:
    """A node in the electrical network graph."""
    node_id: str
    node_type: str  # SOURCE, BUSBAR, JUNCTION, TOWER, LOAD_POINT
    name: str
    nominal_voltage_kv: float = 11.0
    pos_x: float = 0.0
    pos_y: float = 0.0
    pos_z: float = 0.0
    is_energized: bool = True


@dataclass
class SimEdge:
    """An edge (conductor/cable) in the electrical network graph."""
    edge_id: str
    edge_type: str
    name: str
    from_node_id: str
    to_node_id: str
    length_km: float = 0.1
    resistance_ohm_per_km: float = 0.5
    reactance_ohm_per_km: float = 0.4
    max_current_a: float = 200.0
    is_active: bool = True


@dataclass
class SimSwitch:
    """A modeled network switch."""
    switch_id: str
    name: str
    controlled_edge_id: str
    state: str = "CLOSED"  # "CLOSED" or "OPEN"
    section_id: Optional[str] = None


@dataclass 
class SimLoad:
    """A load connected to the network."""
    load_id: str
    name: str
    connected_node_id: str
    demand_kw: float = 10.0
    power_factor: float = 0.95
    is_connected: bool = True
    is_energized: bool = True
    section_id: Optional[str] = None


@dataclass
class ConnectivityResult:
    """Result of a connectivity simulation."""
    energized_nodes: list[str] = field(default_factory=list)
    de_energized_nodes: list[str] = field(default_factory=list)
    energized_loads: list[str] = field(default_factory=list)
    de_energized_loads: list[str] = field(default_factory=list)
    switch_states: dict[str, str] = field(default_factory=dict)
    paths: dict[str, list[str]] = field(default_factory=dict)
    total_demand_kw: float = 0.0
    served_demand_kw: float = 0.0
    unserved_demand_kw: float = 0.0
    disconnected_components: list[list[str]] = field(default_factory=list)
    affected_sections: list[str] = field(default_factory=list)


@dataclass
class EducationalResult:
    """Result of educational electrical calculations."""
    node_voltages: dict[str, float] = field(default_factory=dict)  # node_id -> voltage kV
    edge_currents: dict[str, float] = field(default_factory=dict)  # edge_id -> current A
    edge_power_flows: dict[str, float] = field(default_factory=dict)  # edge_id -> power kW
    edge_losses: dict[str, float] = field(default_factory=dict)  # edge_id -> loss kW
    edge_voltage_drops: dict[str, float] = field(default_factory=dict)  # edge_id -> drop V
    total_losses_kw: float = 0.0
    total_generation_kw: float = 0.0
    total_load_kw: float = 0.0
    assumptions: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    equations_used: list[str] = field(default_factory=list)


class NetworkSimulator:
    """
    Graph-based electricity distribution network simulator.
    
    This simulator uses NetworkX to model the network topology and
    performs connectivity analysis and educational calculations.
    """

    def __init__(self):
        self.graph = nx.Graph()
        self.nodes: dict[str, SimNode] = {}
        self.edges: dict[str, SimEdge] = {}
        self.switches: dict[str, SimSwitch] = {}
        self.loads: dict[str, SimLoad] = {}
        self.source_nodes: list[str] = []

    def clear(self):
        """Clear all network data."""
        self.graph.clear()
        self.nodes.clear()
        self.edges.clear()
        self.switches.clear()
        self.loads.clear()
        self.source_nodes.clear()

    def add_node(self, node: SimNode):
        """Add a node to the network."""
        self.nodes[node.node_id] = node
        self.graph.add_node(node.node_id, **{
            "node_type": node.node_type,
            "name": node.name,
            "nominal_voltage_kv": node.nominal_voltage_kv,
        })
        if node.node_type == "SOURCE":
            self.source_nodes.append(node.node_id)

    def add_edge(self, edge: SimEdge):
        """Add an edge (conductor) to the network."""
        self.edges[edge.edge_id] = edge
        if edge.is_active:
            self.graph.add_edge(
                edge.from_node_id, edge.to_node_id,
                edge_id=edge.edge_id,
                length_km=edge.length_km,
                resistance_ohm_per_km=edge.resistance_ohm_per_km,
                reactance_ohm_per_km=edge.reactance_ohm_per_km,
                max_current_a=edge.max_current_a,
            )

    def add_switch(self, switch: SimSwitch):
        """Add a switch to the network."""
        self.switches[switch.switch_id] = switch

    def add_load(self, load: SimLoad):
        """Add a load to the network."""
        self.loads[load.load_id] = load

    def validate_topology(self) -> list[str]:
        """Validate the network topology. Returns a list of errors."""
        errors = []
        
        # Check that sources exist
        if not self.source_nodes:
            errors.append("No source nodes defined in the network.")
        
        # Check edge references
        for edge_id, edge in self.edges.items():
            if edge.from_node_id not in self.nodes:
                errors.append(f"Edge {edge_id}: from_node '{edge.from_node_id}' does not exist.")
            if edge.to_node_id not in self.nodes:
                errors.append(f"Edge {edge_id}: to_node '{edge.to_node_id}' does not exist.")
        
        # Check switch references
        for sw_id, sw in self.switches.items():
            if sw.controlled_edge_id not in self.edges:
                errors.append(f"Switch {sw_id}: controlled edge '{sw.controlled_edge_id}' does not exist.")
        
        # Check load references
        for ld_id, ld in self.loads.items():
            if ld.connected_node_id not in self.nodes:
                errors.append(f"Load {ld_id}: connected node '{ld.connected_node_id}' does not exist.")
        
        # Check connectivity (with all switches closed)
        if not errors and self.source_nodes:
            # Build graph with all edges
            test_graph = nx.Graph()
            for node_id in self.nodes:
                test_graph.add_node(node_id)
            for edge in self.edges.values():
                test_graph.add_edge(edge.from_node_id, edge.to_node_id)
            
            if not nx.is_connected(test_graph):
                components = list(nx.connected_components(test_graph))
                unreachable = []
                for comp in components:
                    if not any(s in comp for s in self.source_nodes):
                        unreachable.extend(list(comp))
                if unreachable:
                    errors.append(
                        f"WARNING: Nodes {unreachable} are not reachable from any source "
                        f"even with all switches closed."
                    )
        
        return errors

    def _build_active_graph(self) -> nx.Graph:
        """Build a graph using only active edges (respecting switch states)."""
        g = nx.Graph()
        
        # Add all nodes
        for node_id, node in self.nodes.items():
            g.add_node(node_id, node_type=node.node_type)
        
        # Determine which edges are blocked by open switches
        open_switch_edges = set()
        for sw in self.switches.values():
            if sw.state == "OPEN":
                open_switch_edges.add(sw.controlled_edge_id)
        
        # Add active edges
        for edge_id, edge in self.edges.items():
            if edge.is_active and edge_id not in open_switch_edges:
                g.add_edge(
                    edge.from_node_id, edge.to_node_id,
                    edge_id=edge_id,
                    length_km=edge.length_km,
                    resistance_ohm_per_km=edge.resistance_ohm_per_km or 0.5,
                    reactance_ohm_per_km=edge.reactance_ohm_per_km or 0.4,
                    max_current_a=edge.max_current_a or 200.0,
                )
        
        return g

    def run_connectivity(self) -> ConnectivityResult:
        """
        Stage A: Run connectivity simulation.
        
        Determines which nodes and loads are energized based on
        the current switch states and network topology.
        """
        result = ConnectivityResult()
        
        # Build graph with current switch states
        active_graph = self._build_active_graph()
        
        # Record switch states
        for sw_id, sw in self.switches.items():
            result.switch_states[sw_id] = sw.state
        
        # Find all nodes reachable from sources
        energized = set()
        for source in self.source_nodes:
            if source in active_graph:
                reachable = nx.descendants(active_graph, source)
                reachable.add(source)
                energized.update(reachable)
                
                # Record paths from source to each reachable node
                for node in reachable:
                    if node != source:
                        try:
                            path = nx.shortest_path(active_graph, source, node)
                            result.paths[node] = path
                        except nx.NetworkXNoPath:
                            pass
        
        # Classify nodes
        all_node_ids = set(self.nodes.keys())
        result.energized_nodes = sorted(list(energized))
        result.de_energized_nodes = sorted(list(all_node_ids - energized))
        
        # Classify loads
        total_demand = 0.0
        served_demand = 0.0
        unserved_demand = 0.0
        
        affected_sections = set()
        
        for load_id, load in self.loads.items():
            total_demand += load.demand_kw
            
            if load.connected_node_id in energized and load.is_connected:
                result.energized_loads.append(load_id)
                served_demand += load.demand_kw
                load.is_energized = True
            else:
                result.de_energized_loads.append(load_id)
                unserved_demand += load.demand_kw
                load.is_energized = False
                if load.section_id:
                    affected_sections.add(load.section_id)
        
        # Update node energization state
        for node_id, node in self.nodes.items():
            node.is_energized = node_id in energized
        
        result.total_demand_kw = round(total_demand, 2)
        result.served_demand_kw = round(served_demand, 2)
        result.unserved_demand_kw = round(unserved_demand, 2)
        result.affected_sections = sorted(list(affected_sections))
        
        # Find disconnected components
        components = list(nx.connected_components(active_graph))
        for comp in components:
            if not any(s in comp for s in self.source_nodes):
                result.disconnected_components.append(sorted(list(comp)))
        
        return result

    def operate_switch(self, switch_id: str, requested_state: str) -> tuple[ConnectivityResult, str]:
        """
        Operate a modeled network switch and recalculate connectivity.
        
        Returns (ConnectivityResult, message)
        """
        if switch_id not in self.switches:
            raise ValueError(f"Switch '{switch_id}' not found in network.")
        
        if requested_state not in ("OPEN", "CLOSED"):
            raise ValueError(f"Invalid switch state: {requested_state}")
        
        switch = self.switches[switch_id]
        previous_state = switch.state
        
        if switch.state == requested_state:
            result = self.run_connectivity()
            return result, f"Switch {switch_id} is already {requested_state}."
        
        # Operate the switch
        switch.state = requested_state
        
        # Recalculate connectivity
        result = self.run_connectivity()
        
        message = (
            f"Switch {switch_id} changed from {previous_state} to {requested_state}. "
            f"Energized: {len(result.energized_nodes)} nodes, "
            f"De-energized: {len(result.de_energized_nodes)} nodes. "
            f"Served demand: {result.served_demand_kw} kW / {result.total_demand_kw} kW."
        )
        
        return result, message

    def run_educational_calculations(self) -> EducationalResult:
        """
        Stage B: Educational electrical calculations.
        
        Performs simplified DC-approximation calculations for
        voltage drop, current, power flow, and losses.
        
        WARNING: These are illustrative approximations using simplified
        resistive models. They are NOT validated AC power-flow results.
        """
        result = EducationalResult()
        result.assumptions = [
            "Simplified DC resistive model (not AC power flow)",
            "Balanced three-phase assumed",
            "Constant power factor loads",
            "No reactive power compensation",
            "Nominal voltage at source",
            "Uniform conductor parameters",
        ]
        result.equations_used = [
            "I = P / (√3 × V × cos φ)  [Three-phase current]",
            "ΔV = I × R × L  [Voltage drop]",
            "P_loss = I² × R × L  [Line losses]",
        ]
        
        # Get connectivity first
        connectivity = self.run_connectivity()
        
        active_graph = self._build_active_graph()
        
        # For each energized load, trace path from source and calculate
        total_losses = 0.0
        total_load = 0.0
        
        for load_id in connectivity.energized_loads:
            load = self.loads[load_id]
            total_load += load.demand_kw
            
            # Find path from source to load
            path = connectivity.paths.get(load.connected_node_id, [])
            if len(path) < 2:
                continue
            
            # Calculate current drawn by this load
            source_node = self.nodes.get(self.source_nodes[0]) if self.source_nodes else None
            if not source_node:
                continue
            
            nominal_v = source_node.nominal_voltage_kv * 1000  # Convert to V
            
            # Three-phase current
            current = (load.demand_kw * 1000) / (math.sqrt(3) * nominal_v * load.power_factor)
            
            # Trace each edge in the path
            cumulative_drop = 0.0
            for i in range(len(path) - 1):
                from_n = path[i]
                to_n = path[i + 1]
                
                # Find the edge
                edge_data = active_graph.get_edge_data(from_n, to_n)
                if edge_data:
                    edge_id = edge_data.get("edge_id", f"{from_n}-{to_n}")
                    r_per_km = edge_data.get("resistance_ohm_per_km", 0.5)
                    length = edge_data.get("length_km", 0.1)
                    
                    # Voltage drop
                    v_drop = current * r_per_km * length
                    cumulative_drop += v_drop
                    
                    # Power loss
                    p_loss = (current ** 2) * r_per_km * length / 1000  # kW
                    total_losses += p_loss
                    
                    # Accumulate per-edge values
                    if edge_id not in result.edge_currents:
                        result.edge_currents[edge_id] = 0.0
                        result.edge_losses[edge_id] = 0.0
                        result.edge_voltage_drops[edge_id] = 0.0
                        result.edge_power_flows[edge_id] = 0.0
                    
                    result.edge_currents[edge_id] += round(current, 3)
                    result.edge_losses[edge_id] += round(p_loss, 4)
                    result.edge_voltage_drops[edge_id] += round(v_drop, 2)
                    result.edge_power_flows[edge_id] += round(load.demand_kw, 2)
            
            # Node voltage at load point
            load_voltage = nominal_v - cumulative_drop
            result.node_voltages[load.connected_node_id] = round(load_voltage / 1000, 4)
        
        # Source node voltage
        for source in self.source_nodes:
            src_node = self.nodes.get(source)
            if src_node:
                result.node_voltages[source] = src_node.nominal_voltage_kv
        
        result.total_losses_kw = round(total_losses, 4)
        result.total_load_kw = round(total_load, 2)
        result.total_generation_kw = round(total_load + total_losses, 2)
        
        # Add warnings
        for edge_id, current in result.edge_currents.items():
            edge = self.edges.get(edge_id)
            if edge and edge.max_current_a and current > edge.max_current_a:
                result.warnings.append(
                    f"Edge {edge_id}: Current {current:.1f}A exceeds rating {edge.max_current_a:.0f}A"
                )
        
        for node_id, voltage in result.node_voltages.items():
            node = self.nodes.get(node_id)
            if node and node.nominal_voltage_kv:
                deviation = abs(voltage - node.nominal_voltage_kv) / node.nominal_voltage_kv * 100
                if deviation > 5:
                    result.warnings.append(
                        f"Node {node_id}: Voltage {voltage:.3f}kV deviates {deviation:.1f}% from nominal"
                    )
        
        return result

    def get_network_summary(self) -> dict:
        """Get a summary of the current network state."""
        connectivity = self.run_connectivity()
        return {
            "total_nodes": len(self.nodes),
            "total_edges": len(self.edges),
            "total_switches": len(self.switches),
            "total_loads": len(self.loads),
            "source_nodes": self.source_nodes,
            "energized_nodes": len(connectivity.energized_nodes),
            "de_energized_nodes": len(connectivity.de_energized_nodes),
            "energized_loads": len(connectivity.energized_loads),
            "de_energized_loads": len(connectivity.de_energized_loads),
            "total_demand_kw": connectivity.total_demand_kw,
            "served_demand_kw": connectivity.served_demand_kw,
            "unserved_demand_kw": connectivity.unserved_demand_kw,
            "switch_states": connectivity.switch_states,
        }


def create_default_five_section_network() -> NetworkSimulator:
    """
    Create the default five-section distribution network.
    
    Network topology:
    
    [SOURCE] --E1-- [BUSBAR] --E2-- [T1] --E3-- [T2] --E4-- [T3] --E5-- [T4] --E6-- [T5]
                                     |           |           |           |           |
                                   [L1]        [L2]        [L3]        [L4]        [L5]
    
    Switches:
    - SW1: Controls E2 (isolates T1 section)
    - SW2: Controls E3 (isolates T2 section from T1)
    - SW3: Controls E4 (isolates T3 section from T2)
    - SW4: Controls E5 (isolates T4 section from T3)
    - SW5: Controls E6 (isolates T5 section from T4)
    
    NOTE: In this radial topology, opening SW3 disconnects T3, T4, and T5 from the source.
    This is the realistic behavior. The physical miniature model may use independent
    branches, which is a different (simpler) physical mapping documented separately.
    """
    sim = NetworkSimulator()
    
    # Add nodes
    sim.add_node(SimNode("SRC", "SOURCE", "Substation Source", 11.0, pos_x=-20, pos_y=0, pos_z=0))
    sim.add_node(SimNode("BUS1", "BUSBAR", "Main Busbar", 11.0, pos_x=-12, pos_y=0, pos_z=0))
    sim.add_node(SimNode("N_T1", "TOWER", "Tower T1 Node", 11.0, pos_x=-6, pos_y=0, pos_z=0))
    sim.add_node(SimNode("N_T2", "TOWER", "Tower T2 Node", 11.0, pos_x=0, pos_y=0, pos_z=0))
    sim.add_node(SimNode("N_T3", "TOWER", "Tower T3 Node", 11.0, pos_x=6, pos_y=0, pos_z=0))
    sim.add_node(SimNode("N_T4", "TOWER", "Tower T4 Node", 11.0, pos_x=12, pos_y=0, pos_z=0))
    sim.add_node(SimNode("N_T5", "TOWER", "Tower T5 Node", 11.0, pos_x=18, pos_y=0, pos_z=0))
    
    # Load point nodes
    sim.add_node(SimNode("LP_T1", "LOAD_POINT", "T1 Load Point", 0.4, pos_x=-6, pos_y=-3, pos_z=0))
    sim.add_node(SimNode("LP_T2", "LOAD_POINT", "T2 Load Point", 0.4, pos_x=0, pos_y=-3, pos_z=0))
    sim.add_node(SimNode("LP_T3", "LOAD_POINT", "T3 Load Point", 0.4, pos_x=6, pos_y=-3, pos_z=0))
    sim.add_node(SimNode("LP_T4", "LOAD_POINT", "T4 Load Point", 0.4, pos_x=12, pos_y=-3, pos_z=0))
    sim.add_node(SimNode("LP_T5", "LOAD_POINT", "T5 Load Point", 0.4, pos_x=18, pos_y=-3, pos_z=0))
    
    # Main feeder edges
    sim.add_edge(SimEdge("E1", "CONDUCTOR", "Source to Busbar", "SRC", "BUS1", 0.5, 0.3, 0.25, 400))
    sim.add_edge(SimEdge("E2", "CONDUCTOR", "Busbar to T1", "BUS1", "N_T1", 1.0, 0.5, 0.4, 300))
    sim.add_edge(SimEdge("E3", "CONDUCTOR", "T1 to T2", "N_T1", "N_T2", 1.2, 0.5, 0.4, 250))
    sim.add_edge(SimEdge("E4", "CONDUCTOR", "T2 to T3", "N_T2", "N_T3", 1.0, 0.5, 0.4, 250))
    sim.add_edge(SimEdge("E5", "CONDUCTOR", "T3 to T4", "N_T3", "N_T4", 0.8, 0.5, 0.4, 200))
    sim.add_edge(SimEdge("E6", "CONDUCTOR", "T4 to T5", "N_T4", "N_T5", 1.0, 0.5, 0.4, 200))
    
    # Distribution transformer edges (tower to load point)
    sim.add_edge(SimEdge("ET1", "TRANSFORMER_WINDING", "T1 Transformer", "N_T1", "LP_T1", 0.01, 2.0, 5.0, 50))
    sim.add_edge(SimEdge("ET2", "TRANSFORMER_WINDING", "T2 Transformer", "N_T2", "LP_T2", 0.01, 2.0, 5.0, 50))
    sim.add_edge(SimEdge("ET3", "TRANSFORMER_WINDING", "T3 Transformer", "N_T3", "LP_T3", 0.01, 2.0, 5.0, 50))
    sim.add_edge(SimEdge("ET4", "TRANSFORMER_WINDING", "T4 Transformer", "N_T4", "LP_T4", 0.01, 2.0, 5.0, 50))
    sim.add_edge(SimEdge("ET5", "TRANSFORMER_WINDING", "T5 Transformer", "N_T5", "LP_T5", 0.01, 2.0, 5.0, 50))
    
    # Switches on the feeder sections
    sim.add_switch(SimSwitch("SW1", "Section Switch T1", "E2", "CLOSED", "T1"))
    sim.add_switch(SimSwitch("SW2", "Section Switch T2", "E3", "CLOSED", "T2"))
    sim.add_switch(SimSwitch("SW3", "Section Switch T3", "E4", "CLOSED", "T3"))
    sim.add_switch(SimSwitch("SW4", "Section Switch T4", "E5", "CLOSED", "T4"))
    sim.add_switch(SimSwitch("SW5", "Section Switch T5", "E6", "CLOSED", "T5"))
    
    # Loads
    sim.add_load(SimLoad("L1", "T1 Residential Load", "LP_T1", 25.0, 0.95, True, True, "T1"))
    sim.add_load(SimLoad("L2", "T2 Commercial Load", "LP_T2", 40.0, 0.90, True, True, "T2"))
    sim.add_load(SimLoad("L3", "T3 Industrial Load", "LP_T3", 60.0, 0.85, True, True, "T3"))
    sim.add_load(SimLoad("L4", "T4 Residential Load", "LP_T4", 30.0, 0.95, True, True, "T4"))
    sim.add_load(SimLoad("L5", "T5 Mixed Load", "LP_T5", 35.0, 0.92, True, True, "T5"))
    
    return sim
