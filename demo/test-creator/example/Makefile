CXX = g++
CXXFLAGS = -std=c++14 -Wall -I.
LDFLAGS = -lgtest -lgtest_main -pthread

SOURCES = Calculator.cpp output/example/CalculatorTest.cpp
OBJECTS = $(SOURCES:.cpp=.o)
EXECUTABLE = calculator_tests

all: $(EXECUTABLE)

$(EXECUTABLE): $(OBJECTS)
	$(CXX) $(OBJECTS) -o $@ $(LDFLAGS)

.cpp.o:
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(OBJECTS) $(EXECUTABLE)

test: $(EXECUTABLE)
	./$(EXECUTABLE)