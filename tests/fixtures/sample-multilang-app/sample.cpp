// Sample C++ file for Zaria multi-language fixture.
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <algorithm>

struct Record {
    int id;
    std::string name;
    double value;
};

class DataProcessor {
public:
    explicit DataProcessor(std::vector<Record> records)
        : records_(std::move(records)) {}

    std::vector<Record> process() {
        for (auto &r : records_) {
            trim(r.name);
        }
        return records_;
    }

private:
    std::vector<Record> records_;

    static void trim(std::string &s) {
        s.erase(s.begin(), std::find_if(s.begin(), s.end(), [](unsigned char c) {
            return !std::isspace(c);
        }));
        s.erase(std::find_if(s.rbegin(), s.rend(), [](unsigned char c) {
            return !std::isspace(c);
        }).base(), s.end());
    }
};

std::string loadFile(const std::string &path) {
    std::ifstream ifs(path);
    if (!ifs) throw std::runtime_error("cannot open: " + path);
    std::ostringstream ss;
    ss << ifs.rdbuf();
    return ss.str();
}

void writeFile(const std::string &path, const std::string &content) {
    std::ofstream ofs(path);
    if (!ofs) throw std::runtime_error("cannot open: " + path);
    ofs << content;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        std::cerr << "usage: sample <path>\n";
        return 1;
    }
    try {
        auto content = loadFile(argv[1]);
        std::cout << content.substr(0, 80) << '\n';
    } catch (const std::exception &e) {
        std::cerr << e.what() << '\n';
        return 1;
    }
    return 0;
}
