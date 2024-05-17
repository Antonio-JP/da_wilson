from dalgebra.commutators import *

import os
import pickle

def load_file(file_path):
    r'''Load an .out file to get the polynomials represented'''
    try:
        with open(file_path, "rb") as f:
            return pickle.load(f)
    except Exception:
        return None
    
def print_in_file(string, file_path):
    with open(file_path, "w") as file:
        file.write(string)

def generate_latex(P, file_path):
    r'''Creates the LaTeX representation of the polynomials and stores it in a given file_path'''
    print_in_file(P._latex_(), file_path)

def generate_maple(P, file_path):
    r'''Creates the Maple representation of the polynomials and stores it in a given file_path'''
    print_in_file(P._maple_("z", "t", "D"), file_path)

def generate_mathematica(P, file_path):
    r'''Creates the Mathematica representation of the polynomials and stores it in a given file_path'''
    print_in_file(P._mathematica_("z", "t", "DD"), file_path)

if __name__ == "__main__":
    PAD_SIZE = os.get_terminal_size()[0]
    print("".ljust(PAD_SIZE, "#"))
    print("### GENERATING FILES FROM SAGEMATH FORMAT  ".ljust(PAD_SIZE, "#"))
    print("".ljust(PAD_SIZE, "#"))

    for file in os.scandir(os.path.join(".", "data")):
        if file.name.endswith(".out"): # file not yet processed
            print(f"+ Processing file {file.name}")

            current_dir = os.path.dirname(file.path)

            ## Reading the file data
            out = load_file(file.path)
            if out == None:
                print(f"- An error ocurred while reading file {file.name}")
                continue
            P, H = out # we obtain the polynomials

            print("++ Obtaining information about the object...")
            z = P.parent().gen("z")
            m = P.order(z)
            n = len(H)+1
            print(f"-- Data obtained: {n=} and {m=}")

            base_file_name = f"({n}_{m})"

            ## Generating LaTeX files
            print("++ Generating LaTeX files...")
            generate_latex(P, os.path.join(current_dir, "latex", base_file_name + "[P].tex"))
            print(f"+++ Generated LaTeX files for P_{m} (case {n=})")
            for i in range(n-1):
                generate_latex(H[i], os.path.join(current_dir, "latex", base_file_name + f"[H_{i}].tex"))
                print(f"+++ Generated LaTeX files for H_{m},{i} (case {n=})")
            print(f"-- Generated all LaTeX files.")

            ## Generating Maple files
            print("++ Generating Maple files...")
            generate_maple(P, os.path.join(current_dir, "maple", base_file_name + "[P].mpl"))
            print(f"+++ Generated Maple files for P_{m} (case {n=})")
            for i in range(n-1):
                generate_maple(H[i], os.path.join(current_dir, "maple", base_file_name + f"[H_{i}].mpl"))
                print(f"+++ Generated Maple files for H_{m},{i} (case {n=})")
            print(f"-- Generated all Maple files.")

            ## Generating Mathematica files
            print("++ Generating Mathematica files...")
            generate_mathematica(P, os.path.join(current_dir, "mathematica", base_file_name + "[P].nb"))
            print(f"+++ Generated Mathematica files for P_{m} (case {n=})")
            for i in range(n-1):
                generate_mathematica(H[i], os.path.join(current_dir, "mathematica", base_file_name + f"[H_{i}].nb"))
                print(f"+++ Generated Mathematica files for H_{m},{i} (case {n=})")
            print(f"-- Generated all Mathematica files.")

            ## Changing name of the .out file
            print(f"+ Fully processed file {file.name}... Moving to folder `sage`...")
            os.rename(file.path, os.path.join(os.path.dirname(file.path), "sage", f"{base_file_name}.out"))
            print("- Done!")



