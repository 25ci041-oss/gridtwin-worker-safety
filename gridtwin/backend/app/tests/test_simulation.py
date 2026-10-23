"""GRIDTWIN Backend - Simulation Engine Tests"""
import pytest
from app.simulation.engine import (
    NetworkSimulator, SimNode, SimEdge, SimSwitch, SimLoad,
    create_default_five_section_network, ConnectivityResult
)


class TestNetworkSimulator:
    """Tests for the graph-based simulation engine."""

    def setup_method(self):
        """Create a fresh simulator for each test."""
        self.sim = create_default_five_section_network()

    def test_default_network_has_correct_structure(self):
        """Verify the default network has the expected number of components."""
        assert len(self.sim.nodes) == 12  # 7 main + 5 load points
        assert len(self.sim.edges) == 11  # 6 feeder + 5 transformer
        assert len(self.sim.switches) == 5
        assert len(self.sim.loads) == 5
        assert len(self.sim.source_nodes) == 1

    def test_topology_validation_passes(self):
        """Default network should validate without errors."""
        errors = self.sim.validate_topology()
        assert len(errors) == 0, f"Validation errors: {errors}"

    def test_all_nodes_energized_initially(self):
        """With all switches closed, all nodes should be energized."""
        result = self.sim.run_connectivity()
        assert len(result.de_energized_nodes) == 0
        assert len(result.energized_nodes) == 12
        assert len(result.energized_loads) == 5
        assert len(result.de_energized_loads) == 0

    def test_total_demand_calculation(self):
        """Verify total demand calculation."""
        result = self.sim.run_connectivity()
        # L1=25, L2=40, L3=60, L4=30, L5=35 = 190 kW
        assert result.total_demand_kw == 190.0
        assert result.served_demand_kw == 190.0
        assert result.unserved_demand_kw == 0.0

    def test_open_sw3_disconnects_t3_t4_t5(self):
        """Opening SW3 (controls E4: T2→T3) should disconnect T3, T4, T5."""
        result, message = self.sim.operate_switch("SW3", "OPEN")
        
        # T3, T4, T5 and their load points should be de-energized
        assert "N_T3" in result.de_energized_nodes
        assert "N_T4" in result.de_energized_nodes
        assert "N_T5" in result.de_energized_nodes
        assert "LP_T3" in result.de_energized_nodes
        assert "LP_T4" in result.de_energized_nodes
        assert "LP_T5" in result.de_energized_nodes
        
        # T1, T2 and source should still be energized
        assert "SRC" in result.energized_nodes
        assert "BUS1" in result.energized_nodes
        assert "N_T1" in result.energized_nodes
        assert "N_T2" in result.energized_nodes
        
        # Check affected loads
        assert "L3" in result.de_energized_loads
        assert "L4" in result.de_energized_loads
        assert "L5" in result.de_energized_loads
        assert "L1" in result.energized_loads
        assert "L2" in result.energized_loads

    def test_open_sw3_demand_calculation(self):
        """Opening SW3 should reduce served demand by T3+T4+T5 loads."""
        result, _ = self.sim.operate_switch("SW3", "OPEN")
        # T3=60, T4=30, T5=35 = 125 kW unserved
        assert result.unserved_demand_kw == 125.0
        assert result.served_demand_kw == 65.0

    def test_close_switch_restores_connectivity(self):
        """Closing a previously opened switch should restore connectivity."""
        self.sim.operate_switch("SW3", "OPEN")
        result, _ = self.sim.operate_switch("SW3", "CLOSED")
        
        assert len(result.de_energized_nodes) == 0
        assert len(result.energized_loads) == 5

    def test_open_sw1_disconnects_all_towers(self):
        """Opening SW1 (Busbar→T1) should disconnect all towers."""
        result, _ = self.sim.operate_switch("SW1", "OPEN")
        
        # All towers and load points disconnected
        for i in range(1, 6):
            assert f"N_T{i}" in result.de_energized_nodes
            assert f"LP_T{i}" in result.de_energized_nodes
        
        assert result.served_demand_kw == 0.0
        assert result.unserved_demand_kw == 190.0

    def test_open_sw5_only_disconnects_t5(self):
        """Opening SW5 (T4→T5) should only disconnect T5."""
        result, _ = self.sim.operate_switch("SW5", "OPEN")
        
        assert "N_T5" in result.de_energized_nodes
        assert "LP_T5" in result.de_energized_nodes
        assert len(result.de_energized_loads) == 1
        assert "L5" in result.de_energized_loads

    def test_switch_already_in_requested_state(self):
        """Requesting current state should not error."""
        result, message = self.sim.operate_switch("SW1", "CLOSED")
        assert "already" in message.lower()

    def test_invalid_switch_raises_error(self):
        """Operating non-existent switch should raise ValueError."""
        with pytest.raises(ValueError):
            self.sim.operate_switch("SW_INVALID", "OPEN")

    def test_invalid_state_raises_error(self):
        """Invalid switch state should raise ValueError."""
        with pytest.raises(ValueError):
            self.sim.operate_switch("SW1", "INVALID")

    def test_multiple_switches_open(self):
        """Opening multiple switches should have cumulative effect."""
        self.sim.operate_switch("SW2", "OPEN")
        result, _ = self.sim.operate_switch("SW4", "OPEN")
        
        # SW2 open: T2,T3,T4,T5 disconnected
        # SW4 open: would disconnect T4,T5 but they're already disconnected
        assert "N_T2" in result.de_energized_nodes
        assert "N_T3" in result.de_energized_nodes
        assert "N_T4" in result.de_energized_nodes
        assert "N_T5" in result.de_energized_nodes
        assert "N_T1" in result.energized_nodes

    def test_disconnected_components_identified(self):
        """Disconnected components should be identified after switch opening."""
        result, _ = self.sim.operate_switch("SW3", "OPEN")
        
        assert len(result.disconnected_components) > 0
        # The disconnected component should contain T3, T4, T5 nodes
        disconnected_set = set()
        for comp in result.disconnected_components:
            disconnected_set.update(comp)
        assert "N_T3" in disconnected_set

    def test_affected_sections_identified(self):
        """Affected sections should be correctly identified."""
        result, _ = self.sim.operate_switch("SW3", "OPEN")
        
        assert "T3" in result.affected_sections
        assert "T4" in result.affected_sections
        assert "T5" in result.affected_sections

    def test_educational_calculations_run(self):
        """Educational calculations should produce reasonable results."""
        result = self.sim.run_educational_calculations()
        
        assert result.total_load_kw > 0
        assert result.total_generation_kw >= result.total_load_kw
        assert len(result.assumptions) > 0
        assert len(result.equations_used) > 0
        
        # Source voltage should be at nominal
        assert result.node_voltages.get("SRC") == 11.0

    def test_educational_calculations_with_open_switch(self):
        """Educational calculations should reflect open switches."""
        self.sim.operate_switch("SW3", "OPEN")
        result = self.sim.run_educational_calculations()
        
        # Only T1 and T2 should have load calculations
        assert result.total_load_kw < 190.0

    def test_network_summary(self):
        """Network summary should return consistent data."""
        summary = self.sim.get_network_summary()
        
        assert summary["total_nodes"] == 12
        assert summary["total_edges"] == 11
        assert summary["total_switches"] == 5
        assert summary["total_loads"] == 5
        assert summary["energized_nodes"] == 12
        assert summary["de_energized_nodes"] == 0

    def test_topology_validation_catches_invalid_edge(self):
        """Validation should catch edges referencing non-existent nodes."""
        sim = NetworkSimulator()
        sim.add_node(SimNode("A", "SOURCE", "Node A"))
        sim.add_edge(SimEdge("E1", "CONDUCTOR", "Bad Edge", "A", "B_NONEXISTENT"))
        
        errors = sim.validate_topology()
        assert any("B_NONEXISTENT" in e for e in errors)

    def test_topology_validation_catches_invalid_switch(self):
        """Validation should catch switches referencing non-existent edges."""
        sim = NetworkSimulator()
        sim.add_node(SimNode("A", "SOURCE", "Node A"))
        sim.add_switch(SimSwitch("SW1", "Bad Switch", "E_NONEXISTENT"))
        
        errors = sim.validate_topology()
        assert any("E_NONEXISTENT" in e for e in errors)

    def test_paths_from_source(self):
        """Paths from source should be computed for energized nodes."""
        result = self.sim.run_connectivity()
        
        # Each energized non-source node should have a path
        for node_id in result.energized_nodes:
            if node_id != "SRC":
                assert node_id in result.paths
                assert result.paths[node_id][0] == "SRC"


class TestCustomNetwork:
    """Test building custom networks."""

    def test_ring_network(self):
        """Test a ring (loop) network topology."""
        sim = NetworkSimulator()
        sim.add_node(SimNode("S", "SOURCE", "Source"))
        sim.add_node(SimNode("A", "JUNCTION", "Junction A"))
        sim.add_node(SimNode("B", "JUNCTION", "Junction B"))
        sim.add_node(SimNode("C", "JUNCTION", "Junction C"))
        
        sim.add_edge(SimEdge("E1", "CONDUCTOR", "S-A", "S", "A"))
        sim.add_edge(SimEdge("E2", "CONDUCTOR", "A-B", "A", "B"))
        sim.add_edge(SimEdge("E3", "CONDUCTOR", "B-C", "B", "C"))
        sim.add_edge(SimEdge("E4", "CONDUCTOR", "C-A", "C", "A"))  # Ring closure
        
        sim.add_switch(SimSwitch("SW1", "Switch E2", "E2"))
        sim.add_load(SimLoad("L1", "Load B", "B", 20.0))
        
        # All connected
        result = sim.run_connectivity()
        assert len(result.de_energized_nodes) == 0
        
        # Open SW1 (A-B) - B should still be energized via C-A path
        result, _ = sim.operate_switch("SW1", "OPEN")
        assert "B" in result.energized_nodes  # Still reachable via C
