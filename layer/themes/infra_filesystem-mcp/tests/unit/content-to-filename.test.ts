/**
 * Tests for content-to-filename conversion function
 * This ensures that all current content strings are properly converted to valid step file names
 * Special rule: < and > characters should be converted to __ (double underscore)
 */

import { convertContentToFilename } from '../../src/utils/content-converter';

describe('Content to Filename Conversion', () => {
  describe('Current schema content examples', () => {
    const testCases = [
      {
        content: "Check if all other queues are empty before inserting adhoc request",
        expected: "check_if_all_other_queues_are_empty_before_inserting_adhoc_request"
      },
      {
        content: "Register <user-story-item> on NAME_ID.vf.json",
        expected: "register___user_story_item___on_name_id_vf_json"
      },
      {
        content: "Check <scenario-items>, each scenario item should has connected <user-story>/research/(domain|external)/? file or files. and file existance check",
        expected: "check___scenario_items____each_scenario_item_should_has_connected___user_story___research__domain_external____file_or_files__and_file_existance_check"
      },
      {
        content: "Register the <scenario-items> on NAME_ID.vf.json",
        expected: "register_the___scenario_items___on_name_id_vf_json"
      },
      {
        content: "Check external dependencies and log requirements for <environment-test-item>",
        expected: "check_external_dependencies_and_log_requirements_for___environment_test_item__"
      },
      {
        content: "Check external interface requirements for <external-test-item>",
        expected: "check_external_interface_requirements_for___external_test_item__"
      },
      {
        content: "Check <system-test-impl-item> its system sequence diagram and check its external access and register external access on NAME_ID.vf.json",
        expected: "check___system_test_impl_item___its_system_sequence_diagram_and_check_its_external_access_and_register_external_access_on_name_id_vf_json"
      },
      {
        content: "Check <system-test-impl-item> child items Environment Test for each external access unless already there. check all external access match, samething for External Test. for each system test there should be Integration Test matching system_test, coverage duplication check item must",
        expected: "check___system_test_impl_item___child_items_environment_test_for_each_external_access_unless_already_there__check_all_external_access_match__samething_for_external_test__for_each_system_test_there_should_be_integration_test_matching_system_test__coverage_duplication_check_item_must"
      },
      {
        content: "Register <system-test-impl-item> on NAME_ID.vf.json",
        expected: "register___system_test_impl_item___on_name_id_vf_json"
      },
      {
        content: "Check integration test requirements and sequence diagram dependencies",
        expected: "check_integration_test_requirements_and_sequence_diagram_dependencies"
      },
      {
        content: "Check unit test requirements from sequence diagram",
        expected: "check_unit_test_requirements_from_sequence_diagram"
      },
      {
        content: "All system test has matched Integration test and if system test requires dangerous operation then do not write system test for that scenario but make only Integration test with '_FAKE.ts' suffix",
        expected: "all_system_test_has_matched_integration_test_and_if_system_test_requires_dangerous_operation_then_do_not_write_system_test_for_that_scenario_but_make_only_integration_test_with___fake_ts__suffix"
      },
      // New refactored system_tests_implement examples
      {
        content: "Check <system_tests_implement> are match to all <system_sequence_diagram>",
        expected: "check___system_tests_implement___are_match_to_all___system_sequence_diagram__"
      },
      {
        content: "Generate <gen:external_access> of <system_sequence_diagram>",
        expected: "generate___gen_external_access___of___system_sequence_diagram__"
      },
      {
        content: "Insert <gen:coverage_duplication> item for <system_tests_implement>",
        expected: "insert___gen_coverage_duplication___item_for___system_tests_implement__"
      }
    ];

    testCases.forEach(({ content, expected }) => {
      test(`should convert "${content.substring(0, 50)}..." to "${expected.substring(0, 50)}..."`, () => {
        const result = convertContentToFilename(content);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Special character conversion rules', () => {
    test('should convert < and > to double underscore __', () => {
      expect(convertContentToFilename("<test>")).toBe("__test__");
      expect(convertContentToFilename("before <item> after")).toBe("before___item___after");
    });

    test('should handle <gen:...> patterns specially', () => {
      expect(convertContentToFilename("<gen:external_access>")).toBe("__gen_external_access__");
      expect(convertContentToFilename("Generate <gen:coverage_duplication> for test")).toBe("generate___gen_coverage_duplication___for_test");
      expect(convertContentToFilename("<gen:test_item> and <regular_item>")).toBe("__gen_test_item___and___regular_item__");
    });

    test('should convert other special characters to single underscore', () => {
      expect(convertContentToFilename("test/path")).toBe("test_path");
      expect(convertContentToFilename("test-with-dashes")).toBe("test_with_dashes");
      expect(convertContentToFilename("test.with.dots")).toBe("test_with_dots");
      expect(convertContentToFilename("test(with)parens")).toBe("test_with_parens");
      expect(convertContentToFilename("test,with,commas")).toBe("test_with_commas");
    });

    test('should handle mixed special characters', () => {
      expect(convertContentToFilename("<item>/path (test)")).toBe("__item___path__test");
    });
  });

  describe('Edge cases', () => {
    test('should handle empty content', () => {
      expect(convertContentToFilename("")).toBe("");
    });

    test('should handle content with only special characters', () => {
      expect(convertContentToFilename("!@#$%^&*()")).toBe("");
    });

    test('should handle content with mixed case', () => {
      expect(convertContentToFilename("CamelCase and UPPERCASE")).toBe("camelcase_and_uppercase");
    });

    test('should handle content with numbers', () => {
      expect(convertContentToFilename("Test 123 with numbers")).toBe("test_123_with_numbers");
    });

    test('should handle content with multiple consecutive special characters', () => {
      expect(convertContentToFilename("test---with___multiple")).toBe("test___with___multiple");
    });

    test('should handle content with leading/trailing spaces', () => {
      expect(convertContentToFilename("  test with spaces  ")).toBe("test_with_spaces");
    });

    test('should handle content with various brackets and symbols', () => {
      expect(convertContentToFilename("test [with] (brackets) {and} <symbols>")).toBe("test__with___brackets___and____symbols__");
    });

    test('should collapse multiple underscores except for __ from < and >', () => {
      expect(convertContentToFilename("test___multiple___underscores")).toBe("test___multiple___underscores");
      expect(convertContentToFilename("<test>___<item>")).toBe("__test_______item__");
    });
  });

  describe('File system compatibility', () => {
    test('should create valid file names', () => {
      const testContent = "Test: Create file-system compatible names (with special chars!)";
      const result = convertContentToFilename(testContent);
      
      // Should not contain any invalid file system characters except underscores
      expect(result).not.toMatch(/[<>:"/\\|?*!@#$%^&()[\]{}]/);
      
      // Should be lowercase
      expect(result).toBe(result.toLowerCase());
      
      // Should not start or end with single underscores (but __ is allowed)
      expect(result).not.toMatch(/^(?!__)_|(?<!_)_$/);
    });
  });
});