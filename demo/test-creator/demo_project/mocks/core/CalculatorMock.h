#pragma once
#include "gmock/gmock.h"
#include "core/Calculator.h"

namespace core {

class CalculatorMock : public Calculator {
public:
    MOCK_METHOD(int, add, (int a, int b), (const, override));
    MOCK_METHOD(int, subtract, (int a, int b), (const, override));
    MOCK_METHOD(int, multiply, (int a, int b), (const, override));
    MOCK_METHOD(double, divide, (int a, int b), (const, override));
};

} // namespace core
