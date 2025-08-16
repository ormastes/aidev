"""
Behave environment configuration for test-as-manual support
"""
import os
import json
from datetime import datetime
from pathlib import Path


def before_all(context):
    """Setup before all scenarios"""
    context.test_results = []
    context.manual_docs_path = Path("gen/doc/manual-tests")
    context.manual_docs_path.mkdir(parents=True, exist_ok=True)
    context.coverage_data = {}
    

def before_feature(context, feature):
    """Setup before each feature"""
    context.feature_start_time = datetime.now()
    context.current_feature = {
        "name": feature.name,
        "description": feature.description,
        "tags": [tag for tag in feature.tags],
        "scenarios": []
    }


def before_scenario(context, scenario):
    """Setup before each scenario"""
    context.scenario_start_time = datetime.now()
    context.current_scenario = {
        "name": scenario.name,
        "tags": [tag for tag in scenario.tags],
        "steps": [],
        "status": "pending"
    }


def after_step(context, step):
    """Record each step for manual documentation"""
    step_data = {
        "keyword": step.keyword,
        "name": step.name,
        "status": step.status.name,
        "duration": step.duration if hasattr(step, 'duration') else 0
    }
    
    if step.table:
        step_data["table"] = [[cell for cell in row.cells] for row in step.table]
    
    if step.text:
        step_data["text"] = step.text
    
    context.current_scenario["steps"].append(step_data)


def after_scenario(context, scenario):
    """Generate manual test documentation after each scenario"""
    context.current_scenario["status"] = scenario.status.name
    context.current_scenario["duration"] = (datetime.now() - context.scenario_start_time).total_seconds()
    context.current_feature["scenarios"].append(context.current_scenario)
    
    # Generate manual test markdown
    generate_manual_test_doc(context, scenario)


def after_feature(context, feature):
    """Aggregate feature results"""
    context.current_feature["duration"] = (datetime.now() - context.feature_start_time).total_seconds()
    context.test_results.append(context.current_feature)
    
    # Generate feature summary
    generate_feature_summary(context, feature)


def after_all(context):
    """Generate final reports and coverage data"""
    # Generate overall test report
    generate_test_report(context)
    
    # Generate coverage report
    generate_coverage_report(context)


def generate_manual_test_doc(context, scenario):
    """Generate manual test documentation in markdown format"""
    feature_dir = context.manual_docs_path / context.current_feature["name"].replace(" ", "_")
    feature_dir.mkdir(exist_ok=True)
    
    scenario_file = feature_dir / f"{scenario.name.replace(' ', '_')}.md"
    
    with open(scenario_file, "w") as f:
        f.write(f"# Manual Test: {scenario.name}\n\n")
        f.write(f"**Feature:** {context.current_feature['name']}\n\n")
        
        if scenario.description:
            f.write(f"## Description\n{scenario.description}\n\n")
        
        f.write("## Test Steps\n\n")
        
        for i, step in enumerate(context.current_scenario["steps"], 1):
            f.write(f"{i}. **{step['keyword']}** {step['name']}\n")
            
            if step.get("table"):
                f.write("\n   | " + " | ".join(step["table"][0]) + " |\n")
                f.write("   |" + "|".join(["---"] * len(step["table"][0])) + "|\n")
                for row in step["table"][1:]:
                    f.write("   | " + " | ".join(row) + " |\n")
                f.write("\n")
            
            if step.get("text"):
                f.write(f"\n   ```\n   {step['text']}\n   ```\n\n")
        
        f.write("\n## Expected Results\n")
        f.write("- All steps should complete successfully\n")
        f.write("- System should behave as described in each step\n\n")
        
        f.write("## Actual Results\n")
        f.write(f"- **Status:** {context.current_scenario['status']}\n")
        f.write(f"- **Duration:** {context.current_scenario['duration']:.2f} seconds\n")


def generate_feature_summary(context, feature):
    """Generate feature-level summary"""
    summary_file = context.manual_docs_path / f"{feature.name.replace(' ', '_')}_summary.md"
    
    with open(summary_file, "w") as f:
        f.write(f"# Feature Summary: {feature.name}\n\n")
        f.write(f"## Overview\n{feature.description or 'No description provided'}\n\n")
        
        f.write("## Scenarios\n\n")
        f.write("| Scenario | Status | Duration | Steps |\n")
        f.write("|----------|--------|----------|-------|\n")
        
        for scenario in context.current_feature["scenarios"]:
            f.write(f"| {scenario['name']} | {scenario['status']} | "
                   f"{scenario['duration']:.2f}s | {len(scenario['steps'])} |\n")
        
        f.write(f"\n**Total Duration:** {context.current_feature['duration']:.2f} seconds\n")


def generate_test_report(context):
    """Generate overall test report"""
    report_file = context.manual_docs_path / "test_report.json"
    
    report_data = {
        "timestamp": datetime.now().isoformat(),
        "features": context.test_results,
        "summary": {
            "total_features": len(context.test_results),
            "total_scenarios": sum(len(f["scenarios"]) for f in context.test_results),
            "total_steps": sum(len(s["steps"]) for f in context.test_results for s in f["scenarios"])
        }
    }
    
    with open(report_file, "w") as f:
        json.dump(report_data, f, indent=2)


def generate_coverage_report(context):
    """Generate coverage report for Python code"""
    if os.path.exists("coverage.json"):
        with open("coverage.json", "r") as f:
            coverage_data = json.load(f)
        
        summary_file = context.manual_docs_path / "coverage_summary.md"
        
        with open(summary_file, "w") as f:
            f.write("# Coverage Report\n\n")
            f.write("## Summary\n\n")
            
            if "totals" in coverage_data:
                totals = coverage_data["totals"]
                f.write(f"- **Line Coverage:** {totals.get('percent_covered', 0):.2f}%\n")
                f.write(f"- **Branch Coverage:** {totals.get('percent_covered_branches', 0):.2f}%\n")
                f.write(f"- **Total Lines:** {totals.get('num_statements', 0)}\n")
                f.write(f"- **Covered Lines:** {totals.get('covered_lines', 0)}\n")
                f.write(f"- **Missing Lines:** {totals.get('missing_lines', 0)}\n")