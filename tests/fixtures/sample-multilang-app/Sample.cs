// Sample C# file for Zaria multi-language fixture.
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace ZariaFixture
{
    public record Record(int Id, string Name, double Value);

    public interface IProcessor
    {
        IEnumerable<Record> Process(IEnumerable<Record> records);
    }

    public class TrimProcessor : IProcessor
    {
        public IEnumerable<Record> Process(IEnumerable<Record> records)
        {
            return records.Select(r => r with { Name = r.Name.Trim() });
        }
    }

    public static class FileHelper
    {
        public static string LoadFile(string path) => File.ReadAllText(path);

        public static void WriteFile(string path, string content) =>
            File.WriteAllText(path, content);

        public static async Task<string> LoadFileAsync(string path) =>
            await File.ReadAllTextAsync(path);
    }

    public class DataProcessor
    {
        private readonly List<Record> _records;

        public DataProcessor(IEnumerable<Record> records)
        {
            _records = new List<Record>(records);
        }

        public List<Record> Process()
        {
            return _records
                .Select(r => r with { Name = r.Name.Trim() })
                .ToList();
        }

        public static async Task Main(string[] args)
        {
            if (args.Length < 1)
            {
                Console.Error.WriteLine("Usage: sample <path>");
                Environment.Exit(1);
            }
            var content = await FileHelper.LoadFileAsync(args[0]);
            Console.WriteLine(content[..Math.Min(80, content.Length)]);
        }
    }
}
