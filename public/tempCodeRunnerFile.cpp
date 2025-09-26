#include <iostream>
using namespace std;

// Base Class
class Staff {
protected:
    string name;
    int id;
public:
    void input() {
        cout << "Enter Employee Name: ";
        cin >> name;
        cout << "Enter Employee ID: ";
        cin >> id;
    }
    void display() {
        cout << "Name: " << name << "\nID: " << id << endl;
    }
};

// Teacher Class
class Teacher : public Staff {
    string subject, publication;
public:
    void input() {
        Staff::input();
        cout << "Enter Subject: ";
        cin >> subject;
        cout << "Enter Publication: ";
        cin >> publication;
    }
    void display() {
        cout << "\n--- Teacher Details ---\n";
        Staff::display();
        cout << "Subject: " << subject << "\nPublication: " << publication << endl;
    }
};

// Typist Base
class Typist : public Staff {
protected:
    int speed;
public:
    void input() {
        Staff::input();
        cout << "Enter Typing Speed (words per minute): ";
        cin >> speed;
    }
    void display() {
        Staff::display();
        cout << "Typing Speed: " << speed << " wpm" << endl;
    }
};

// Regular Typist
class Regular : public Typist {
    float salary;
public:
    void input() {
        Typist::input();
        cout << "Enter Salary: ";
        cin >> salary;
    }
    void display() {
        cout << "\n--- Regular Typist Details ---\n";
        Typist::display();
        cout << "Salary: " << salary << endl;
    }
};

// Casual Typist
class Casual : public Typist {
    float daily_wages;
public:
    void input() {
        Typist::input();
        cout << "Enter Daily Wages: ";
        cin >> daily_wages;
    }
    void display() {
        cout << "\n--- Casual Typist Details ---\n";
        Typist::display();
        cout << "Daily Wages: " << daily_wages << endl;
    }
};

// Officer Class
class Officer : public Staff {
    string grade;
public:
    void input() {
        Staff::input();
        cout << "Enter Grade: ";
        cin >> grade;
    }
    void display() {
        cout << "\n--- Officer Details ---\n";
        Staff::display();
        cout << "Grade: " << grade << endl;
    }
};

int main() {
    int choice;
    cout << "\n===== Staff Management System =====\n";
    cout << "1. Teacher\n2. Typist (Regular / Casual)\n3. Officer\n";
    cout << "Enter your choice: ";
    cin >> choice;

    switch(choice) {
        case 1: {
            Teacher t;
            t.input();
            t.display();
            break;
        }
        case 2: {
            int typeChoice;
            cout << "\n1. Regular Typist\n2. Casual Typist\n";
            cout << "Enter type: ";
            cin >> typeChoice;

            if(typeChoice == 1) {
                Regular r;
                r.input();
                r.display();
            } else if(typeChoice == 2) {
                Casual c;
                c.input();
                c.display();
            } else {
                cout << "Invalid Typist Choice!\n";
            }
            break;
        }
        case 3: {
            Officer o;
            o.input();
            o.display();
            break;
        }
        default:
            cout << "Invalid choice!\n";
    }

    return 0;
}