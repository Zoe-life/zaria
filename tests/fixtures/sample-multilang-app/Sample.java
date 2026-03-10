// Sample Java file for Zaria multi-language fixture.
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Represents a record of key-value pairs.
 */
public class Record {
    private int id;
    private String name;
    private double value;

    public Record(int id, String name, double value) {
        this.id = id;
        this.name = name;
        this.value = value;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public double getValue() { return value; }
}

/**
 * Processes a list of records.
 */
public class DataProcessor {
    private final List<Record> records;

    public DataProcessor(List<Record> records) {
        this.records = new ArrayList<>(records);
    }

    public List<Record> process() {
        List<Record> result = new ArrayList<>();
        for (Record r : records) {
            r.setName(r.getName().trim());
            result.add(r);
        }
        return result;
    }

    public static String loadFile(Path path) throws IOException {
        return Files.readString(path);
    }

    public static void writeFile(Path path, String content) throws IOException {
        Files.writeString(path, content);
    }

    public static void main(String[] args) throws IOException {
        if (args.length < 1) {
            System.err.println("Usage: DataProcessor <path>");
            System.exit(1);
        }
        String content = loadFile(Path.of(args[0]));
        System.out.println(content.substring(0, Math.min(80, content.length())));
    }
}
